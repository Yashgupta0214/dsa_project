"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useUser } from "@clerk/nextjs";

export interface ActiveUser {
  id: string;
  name: string;
  imageUrl?: string;
}

interface UseChatPresenceProps {
  chatId: string;
}

export function useChatPresence({ chatId }: UseChatPresenceProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useUser();
  const [activeCount, setActiveCount] = useState<number>(1);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  const currentUserName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";

  const currentUserId = user?.id || "anonymous";

  useEffect(() => {
    if (!socket || !chatId) return;

    const eventKey = `chat:${chatId}:active_presence`;

    const handlePresence = (data: { count?: number; users?: ActiveUser[] }) => {
      if (data && typeof data.count === "number") {
        setActiveCount(Math.max(1, data.count));
      }
      if (data && Array.isArray(data.users)) {
        setActiveUsers(data.users);
      }
    };

    socket.on(eventKey, handlePresence);

    // Join this chat view
    socket.emit("chat:view_join", {
      chatId,
      user: {
        id: currentUserId,
        name: currentUserName,
        imageUrl: user?.imageUrl
      }
    });

    // Request active viewers immediately
    socket.emit("chat:get_active", { chatId });

    return () => {
      socket.off(eventKey, handlePresence);
      socket.emit("chat:view_leave", { chatId });
    };
  }, [socket, isConnected, chatId, currentUserId, currentUserName, user?.imageUrl]);

  return {
    activeCount: Math.max(1, activeCount),
    activeUsers
  };
}
