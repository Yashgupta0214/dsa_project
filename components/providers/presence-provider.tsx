"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useSocket } from "@/components/providers/socket-provider";

export type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";

type PresenceData = {
  status: PresenceStatus;
  customStatus?: string;
};

type PresenceContextType = {
  onlineUsers: Record<string, PresenceData>;
  isOnline: (id?: string | null) => boolean;
  getUserStatus: (id?: string | null) => PresenceStatus;
  getCustomStatus: (id?: string | null) => string | undefined;
  updateStatus: (status: PresenceStatus, customStatus?: string) => void;
  myProfileId: string | null;
};

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: {},
  isOnline: () => false,
  getUserStatus: () => "offline",
  getCustomStatus: () => undefined,
  updateStatus: () => {},
  myProfileId: null
});

export const usePresence = () => useContext(PresenceContext);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected } = useSocket();
  const { userId, isSignedIn } = useAuth();

  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceData>>({});

  // Fetch current user's profile ID
  useEffect(() => {
    if (!isSignedIn) return;

    let isMounted = true;
    axios
      .get("/api/profile")
      .then((res) => {
        if (isMounted && res.data?.id) {
          setMyProfileId(res.data.id);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch profile for presence:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isSignedIn]);

  // Read current saved status
  const getMyCurrentStatus = useCallback((): { status: PresenceStatus; customStatus?: string } => {
    if (typeof window === "undefined") return { status: "online" };
    const savedPresence = (localStorage.getItem("user_presence_status") as PresenceStatus) || "online";
    const savedCustom = localStorage.getItem("user_custom_status") || undefined;
    return { status: savedPresence, customStatus: savedCustom };
  }, []);

  // Send join / register to socket when connected
  useEffect(() => {
    if (!socket || !isConnected || (!userId && !myProfileId)) return;

    const { status, customStatus } = getMyCurrentStatus();

    socket.emit("presence:join", {
      profileId: myProfileId,
      userId: userId,
      status,
      customStatus
    });

    socket.emit("presence:sync_request");
  }, [socket, isConnected, userId, myProfileId, getMyCurrentStatus]);

  // Listen to socket presence events
  useEffect(() => {
    if (!socket) return;

    const handleSync = (data: Record<string, PresenceData>) => {
      setOnlineUsers((prev) => ({ ...prev, ...data }));
    };

    const handleUserOnline = (data: { profileId?: string; userId?: string; status: PresenceStatus; customStatus?: string }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        if (data.profileId) next[data.profileId] = { status: data.status, customStatus: data.customStatus };
        if (data.userId) next[data.userId] = { status: data.status, customStatus: data.customStatus };
        return next;
      });
    };

    const handleUserUpdate = (data: { profileId?: string; userId?: string; status: PresenceStatus; customStatus?: string }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        if (data.status === "invisible") {
          if (data.profileId) delete next[data.profileId];
          if (data.userId) delete next[data.userId];
        } else {
          if (data.profileId) next[data.profileId] = { status: data.status, customStatus: data.customStatus };
          if (data.userId) next[data.userId] = { status: data.status, customStatus: data.customStatus };
        }
        return next;
      });
    };

    const handleUserOffline = (data: { profileId?: string; userId?: string }) => {
      setOnlineUsers((prev) => {
        const next = { ...prev };
        if (data.profileId) delete next[data.profileId];
        if (data.userId) delete next[data.userId];
        return next;
      });
    };

    socket.on("presence:sync", handleSync);
    socket.on("presence:user_online", handleUserOnline);
    socket.on("presence:user_update", handleUserUpdate);
    socket.on("presence:user_offline", handleUserOffline);

    return () => {
      socket.off("presence:sync", handleSync);
      socket.off("presence:user_online", handleUserOnline);
      socket.off("presence:user_update", handleUserUpdate);
      socket.off("presence:user_offline", handleUserOffline);
    };
  }, [socket]);

  // Listen to local status changes (from EditProfile or settings)
  useEffect(() => {
    const handleStatusChanged = () => {
      const { status, customStatus } = getMyCurrentStatus();
      if (socket && isConnected && (myProfileId || userId)) {
        socket.emit("presence:update", {
          profileId: myProfileId,
          userId: userId,
          status,
          customStatus
        });
      }
    };

    window.addEventListener("user_status_changed", handleStatusChanged);
    return () => window.removeEventListener("user_status_changed", handleStatusChanged);
  }, [socket, isConnected, myProfileId, userId, getMyCurrentStatus]);

  const updateStatus = useCallback(
    (status: PresenceStatus, customStatus?: string) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("user_presence_status", status);
        if (customStatus !== undefined) {
          localStorage.setItem("user_custom_status", customStatus);
        }
        window.dispatchEvent(new Event("user_status_changed"));
      }

      if (socket && isConnected && (myProfileId || userId)) {
        socket.emit("presence:update", {
          profileId: myProfileId,
          userId: userId,
          status,
          customStatus
        });
      }
    },
    [socket, isConnected, myProfileId, userId]
  );

  const getUserStatus = useCallback(
    (id?: string | null): PresenceStatus => {
      if (!id) return "offline";

      // If it's the current user themselves
      if (id === myProfileId || id === userId) {
        const { status } = getMyCurrentStatus();
        return status;
      }

      const entry = onlineUsers[id];
      if (!entry) return "offline";
      return entry.status;
    },
    [myProfileId, userId, onlineUsers, getMyCurrentStatus]
  );

  const isOnline = useCallback(
    (id?: string | null): boolean => {
      const status = getUserStatus(id);
      return status === "online" || status === "idle" || status === "dnd";
    },
    [getUserStatus]
  );

  const getCustomStatus = useCallback(
    (id?: string | null): string | undefined => {
      if (!id) return undefined;
      if (id === myProfileId || id === userId) {
        return getMyCurrentStatus().customStatus;
      }
      return onlineUsers[id]?.customStatus;
    },
    [myProfileId, userId, onlineUsers, getMyCurrentStatus]
  );

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        isOnline,
        getUserStatus,
        getCustomStatus,
        updateStatus,
        myProfileId
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}
