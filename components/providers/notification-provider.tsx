"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { MessageSquare, Bell, Volume2, X, ExternalLink, AtSign } from "lucide-react";

import { useSocket } from "@/components/providers/socket-provider";
import { playNotificationSound, playMentionSound } from "@/lib/notification-sound";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export type NotificationPayload = {
  id: string;
  content: string;
  fileUrl?: string | null;
  channelId?: string;
  channelName?: string;
  serverId?: string;
  serverName?: string;
  conversationId?: string;
  recipientId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: "channel" | "direct_message" | "webhook";
  isMention?: boolean;
  createdAt?: string;
};

type NotificationContextType = {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  deviceNotificationsEnabled: boolean;
  setDeviceNotificationsEnabled: (enabled: boolean) => void;
};

const NotificationContext = createContext<NotificationContextType>({
  permission: "default",
  requestPermission: async () => "default",
  soundEnabled: true,
  setSoundEnabled: () => {},
  deviceNotificationsEnabled: true,
  setDeviceNotificationsEnabled: () => {}
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { socket } = useSocket();
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [deviceNotificationsEnabled, setDeviceNotificationsState] = useState(true);
  const [activeToast, setActiveToast] = useState<NotificationPayload | null>(null);

  // Initialize preferences & permissions on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      const savedSound = localStorage.getItem("discord_sound_enabled");
      if (savedSound !== null) {
        setSoundEnabledState(savedSound === "true");
      }

      const savedDevice = localStorage.getItem("discord_device_notifs_enabled");
      if (savedDevice !== null) {
        setDeviceNotificationsState(savedDevice === "true");
      }
    }
  }, []);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem("discord_sound_enabled", String(enabled));
  };

  const setDeviceNotificationsEnabled = (enabled: boolean) => {
    setDeviceNotificationsState(enabled);
    localStorage.setItem("discord_device_notifs_enabled", String(enabled));
  };

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      return res;
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return "denied";
    }
  }, []);

  // Listen to incoming global notification events from socket
  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewMessageNotification = (payload: NotificationPayload) => {
      // Don't notify the sender themselves
      if (payload.senderId === userId) return;

      // If it's a DM, only notify the intended recipient
      if (payload.type === "direct_message" && payload.recipientId && payload.recipientId !== userId) {
        return;
      }

      // Check if current user is specifically mentioned (@username, @fullname, @everyone, @here)
      const contentLower = (payload.content || "").toLowerCase();
      const currentUsername = (user?.username || "").toLowerCase();
      const currentFirstName = (user?.firstName || "").toLowerCase();
      const currentFullName = (user?.fullName || "").toLowerCase();

      const isDirectMention = Boolean(
        contentLower.includes("@everyone") ||
        contentLower.includes("@here") ||
        (currentUsername && contentLower.includes(`@${currentUsername}`)) ||
        (currentFirstName && contentLower.includes(`@${currentFirstName}`)) ||
        (currentFullName && contentLower.includes(`@${currentFullName}`))
      );

      payload.isMention = isDirectMention;

      // Check if user is currently actively focused on this exact channel/conversation
      const isInSameChannel =
        payload.channelId && pathname?.includes(`/channels/${payload.channelId}`);
      const isInSameConversation =
        payload.conversationId && pathname?.includes(payload.conversationId);
      const isWindowFocused = typeof document !== "undefined" && document.hasFocus();

      // Play sound if enabled (Distinct mention sound if mentioned!)
      if (soundEnabled) {
        if (isDirectMention) {
          playMentionSound();
        } else {
          playNotificationSound();
        }
      }

      // Show Native OS Device / Desktop Notification if in background, or on a different channel, or if directly mentioned
      if (
        deviceNotificationsEnabled &&
        (!isWindowFocused || !isInSameChannel || isDirectMention) &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const title = isDirectMention
            ? `🚨 ${payload.senderName} mentioned you in #${payload.channelName || "channel"}`
            : payload.type === "direct_message"
            ? `💬 ${payload.senderName} (Direct Message)`
            : `${payload.senderName} in #${payload.channelName || "general"}`;

          const bodyText =
            payload.content || (payload.fileUrl ? "📎 Sent an attachment" : "Sent a message");

          const notif = new Notification(title, {
            body: bodyText,
            icon: payload.senderAvatar || "/favicon.ico",
            badge: "/favicon.ico",
            tag: payload.id
          });

          notif.onclick = () => {
            window.focus();
            if (payload.serverId && payload.channelId) {
              router.push(`/servers/${payload.serverId}/channels/${payload.channelId}`);
            } else if (payload.conversationId) {
              router.push(`/direct-messages`);
            }
            notif.close();
          };
        } catch (e) {
          console.warn("Could not display native notification:", e);
        }
      }

      // Show In-App Interactive Toast if not currently viewing that specific channel, or if directly mentioned
      if (!isInSameChannel && !isInSameConversation || isDirectMention) {
        setActiveToast(payload);
        const timer = setTimeout(() => {
          setActiveToast((prev) => (prev?.id === payload.id ? null : prev));
        }, isDirectMention ? 7000 : 5000);
        return () => clearTimeout(timer);
      }
    };

    socket.on("notification:new_message", handleNewMessageNotification);

    return () => {
      socket.off("notification:new_message", handleNewMessageNotification);
    };
  }, [
    socket,
    userId,
    user,
    pathname,
    soundEnabled,
    deviceNotificationsEnabled,
    router
  ]);

  const handleToastClick = () => {
    if (!activeToast) return;
    if (activeToast.serverId && activeToast.channelId) {
      router.push(`/servers/${activeToast.serverId}/channels/${activeToast.channelId}`);
    } else if (activeToast.conversationId) {
      router.push(`/direct-messages`);
    }
    setActiveToast(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        permission,
        requestPermission,
        soundEnabled,
        setSoundEnabled,
        deviceNotificationsEnabled,
        setDeviceNotificationsEnabled
      }}
    >
      {children}

      {/* Floating Rich Toast Alert */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-4 duration-200">
          <div
            onClick={handleToastClick}
            className={`group relative flex items-start gap-3 w-80 sm:w-96 p-3.5 rounded-xl text-white shadow-2xl backdrop-blur-md cursor-pointer transition-all ${
              activeToast.isMention
                ? "bg-amber-950/95 border-2 border-amber-500 shadow-amber-500/20"
                : "bg-zinc-900/95 dark:bg-[#111214]/95 border border-indigo-500/30 hover:border-indigo-500/60"
            }`}
          >
            <Avatar className="h-10 w-10 border border-white/10 shrink-0">
              <AvatarImage src={activeToast.senderAvatar} />
              <AvatarFallback className="bg-indigo-600 text-white font-bold">
                {activeToast.senderName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeToast.isMention && (
                  <span className="flex items-center gap-0.5 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-black">
                    <AtSign className="w-3 h-3" /> Mention
                  </span>
                )}
                <span className="font-semibold text-sm text-white truncate max-w-[140px]">
                  {activeToast.senderName}
                </span>
                {activeToast.channelName && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-medium truncate max-w-[120px]">
                    #{activeToast.channelName}
                  </span>
                )}
                {activeToast.serverName && (
                  <span className="text-[10px] text-zinc-400 truncate max-w-[100px]">
                    • {activeToast.serverName}
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                {activeToast.content || (activeToast.fileUrl ? "📎 Attachment" : "New message")}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
              className="absolute top-2.5 right-2.5 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
