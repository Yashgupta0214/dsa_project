"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export interface ServerTemporaryState {
  isTemporary: boolean;
  expiryTimestamp: number | null;
  expiryAction: "archive" | "delete";
  isExpired: boolean;
  timeUntilExpiry: number; // seconds
  timeUntilDeletion: number; // seconds
  isAutoDeleting: boolean;
  extendLifespan: (addedDaysOrHours: number) => void;
  setExpiryMinutes: (minutes: number) => void;
  setCustomTimestamp: (timestamp: number) => void;
  setExpiryAction: (action: "archive" | "delete") => void;
  setTemporaryMode: (enabled: boolean, minutesOrDays?: number, action?: "archive" | "delete") => void;
}

export function useServerTemporary(serverId?: string, channelId?: string): ServerTemporaryState {
  const router = useRouter();
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const [expiryAction, setExpiryActionState] = useState<"archive" | "delete">("delete");
  const [now, setNow] = useState(Date.now());

  const loadSettings = useCallback(() => {
    if (!serverId) return;
    try {
      const raw = localStorage.getItem(`server_settings_${serverId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isTemporary !== undefined) setIsTemporary(parsed.isTemporary);
        if (parsed.expiryTimestamp !== undefined) setExpiryTimestamp(parsed.expiryTimestamp);
        if (parsed.expiryAction !== undefined) setExpiryActionState(parsed.expiryAction);
      }
    } catch (err) {
      console.error("Error reading temporary server settings:", err);
    }
  }, [serverId]);

  useEffect(() => {
    loadSettings();

    const handleUpdate = (e: any) => {
      if (!e?.detail?.serverId || e.detail.serverId === serverId) {
        loadSettings();
      }
    };

    window.addEventListener("server_settings_changed", handleUpdate);
    return () => window.removeEventListener("server_settings_changed", handleUpdate);
  }, [serverId, loadSettings]);

  // Clock ticker every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isExpired = isTemporary && expiryTimestamp !== null && now >= expiryTimestamp;
  const timeUntilExpiry = expiryTimestamp ? Math.max(0, Math.floor((expiryTimestamp - now) / 1000)) : 0;

  // 5-minute auto-deletion window (300 seconds) after expiryTimestamp
  const deletionTimestamp = expiryTimestamp ? expiryTimestamp + 5 * 60 * 1000 : null;
  const timeUntilDeletion = deletionTimestamp ? Math.max(0, Math.floor((deletionTimestamp - now) / 1000)) : 0;

  const isAutoDeleting = isExpired && expiryAction === "delete";

  // Auto-send warning chat message on expiry entry
  useEffect(() => {
    if (!isExpired || !serverId || expiryAction !== "delete") return;

    const warningKey = `server_expired_warning_sent_${serverId}`;
    const alreadySent = localStorage.getItem(warningKey);

    if (!alreadySent) {
      localStorage.setItem(warningKey, "true");

      const sendWarning = async () => {
        try {
          let targetChannelId = channelId;
          if (!targetChannelId) {
            const res = await axios.get(`/api/channels?serverId=${serverId}`);
            const textChannels = res.data?.filter((c: any) => c.type === "TEXT");
            if (textChannels && textChannels.length > 0) {
              targetChannelId = textChannels[0].id;
            }
          }

          if (targetChannelId) {
            await axios.post(`/api/socket/messages?serverId=${serverId}&channelId=${targetChannelId}`, {
              content: "⚠️ [AUTOMATED SYSTEM ALERT]: This temporary server has EXPIRED! In 5 minutes, this server will be permanently deleted. All server features and messaging have been disabled for everyone. Only the option to extend the server lifespan remains enabled."
            });
          }
        } catch (err) {
          console.error("Failed to post auto-delete warning message:", err);
        }
      };

      sendWarning();
    }
  }, [isExpired, serverId, channelId, expiryAction]);

  // Execute actual server deletion when 5-min timer reaches 0
  useEffect(() => {
    if (isAutoDeleting && timeUntilDeletion === 0 && serverId) {
      const deleteKey = `server_deleted_handled_${serverId}`;
      if (localStorage.getItem(deleteKey)) return;
      localStorage.setItem(deleteKey, "true");

      axios
        .delete(`/api/servers/${serverId}`)
        .then(() => {
          localStorage.removeItem(`server_settings_${serverId}`);
          localStorage.removeItem(`server_expired_warning_sent_${serverId}`);
          localStorage.removeItem(deleteKey);
          router.push("/");
          router.refresh();
        })
        .catch((err) => {
          console.error("Auto delete server failed:", err);
          router.push("/");
        });
    }
  }, [isAutoDeleting, timeUntilDeletion, serverId, router]);

  const updateServerSettings = (updates: Record<string, any>) => {
    if (!serverId) return;
    try {
      const key = `server_settings_${serverId}`;
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : {};
      const updated = { ...existing, ...updates };

      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("server_settings_changed", {
          detail: { serverId, ...updated }
        })
      );
    } catch (err) {
      console.error("Failed to save temporary server settings:", err);
    }
  };

  const extendLifespan = (addedDaysOrHours: number = 1) => {
    const addedMs = addedDaysOrHours * 24 * 60 * 60 * 1000;
    const newTarget = Date.now() + addedMs;

    if (serverId) {
      localStorage.removeItem(`server_expired_warning_sent_${serverId}`);
      localStorage.removeItem(`server_deleted_handled_${serverId}`);
    }

    updateServerSettings({
      isTemporary: true,
      expiryTimestamp: newTarget,
      expiryAction
    });
  };

  const setExpiryMinutes = (minutes: number) => {
    const newTarget = Date.now() + minutes * 60 * 1000;
    if (serverId) {
      localStorage.removeItem(`server_expired_warning_sent_${serverId}`);
      localStorage.removeItem(`server_deleted_handled_${serverId}`);
    }
    updateServerSettings({
      isTemporary: true,
      expiryTimestamp: newTarget,
      expiryAction
    });
  };

  const setCustomTimestamp = (timestamp: number) => {
    if (serverId) {
      localStorage.removeItem(`server_expired_warning_sent_${serverId}`);
      localStorage.removeItem(`server_deleted_handled_${serverId}`);
    }
    updateServerSettings({
      isTemporary: true,
      expiryTimestamp: timestamp,
      expiryAction
    });
  };

  const setExpiryAction = (action: "archive" | "delete") => {
    setExpiryActionState(action);
    updateServerSettings({ expiryAction: action });
  };

  const setTemporaryMode = (
    enabled: boolean,
    minutesOrDays: number = 7,
    action: "archive" | "delete" = "delete"
  ) => {
    const target = enabled ? Date.now() + minutesOrDays * 24 * 60 * 60 * 1000 : null;
    if (serverId) {
      localStorage.removeItem(`server_expired_warning_sent_${serverId}`);
      localStorage.removeItem(`server_deleted_handled_${serverId}`);
    }
    updateServerSettings({
      isTemporary: enabled,
      expiryTimestamp: target,
      expiryAction: action
    });
  };

  return {
    isTemporary,
    expiryTimestamp,
    expiryAction,
    isExpired,
    timeUntilExpiry,
    timeUntilDeletion,
    isAutoDeleting,
    extendLifespan,
    setExpiryMinutes,
    setCustomTimestamp,
    setExpiryAction,
    setTemporaryMode
  };
}

