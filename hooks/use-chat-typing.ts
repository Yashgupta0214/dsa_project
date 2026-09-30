"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useUser } from "@clerk/nextjs";

export interface TypingUser {
  id: string;
  name: string;
  lastTypedAt: number;
}

interface UseChatTypingProps {
  chatId: string;
}

export function useChatTyping({ chatId }: UseChatTypingProps) {
  const { socket } = useSocket();
  const { user } = useUser();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isSelfTyping, setIsSelfTyping] = useState(false);
  const isTypingRef = useRef(false);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "You";

  const currentUserId = user?.id || "anonymous";

  // Listen to typing events for this specific chat
  useEffect(() => {
    if (!socket || !chatId) return;

    const eventKey = `chat:${chatId}:typing`;

    const handleTypingEvent = (data: {
      user: { id: string; name: string };
      isTyping: boolean;
    }) => {
      if (!data?.user || data.user.id === currentUserId) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          const filtered = prev.filter((u) => u.id !== data.user.id);
          return [
            ...filtered,
            {
              id: data.user.id,
              name: data.user.name,
              lastTypedAt: Date.now()
            }
          ];
        } else {
          return prev.filter((u) => u.id !== data.user.id);
        }
      });
    };

    socket.on(eventKey, handleTypingEvent);

    return () => {
      socket.off(eventKey, handleTypingEvent);
    };
  }, [socket, chatId, currentUserId]);

  // Clean up stale typing indicators (older than 3.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const active = prev.filter((u) => now - u.lastTypedAt < 3500);
        return active.length === prev.length ? prev : active;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Send typing start notification (via Socket + HTTP API fallback)
  const startTyping = useCallback(() => {
    if (!chatId) return;

    setIsSelfTyping(true);

    if (!isTypingRef.current) {
      isTypingRef.current = true;

      const payload = {
        chatId,
        user: {
          id: currentUserId,
          name: currentUserName
        },
        isTyping: true
      };

      if (socket) {
        socket.emit("chat:typing_start", payload);
      }

      // Fast non-blocking HTTP socket fallback
      fetch("/api/socket/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    stopTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2500);
  }, [socket, chatId, currentUserId, currentUserName]);

  // Send typing stop notification
  const stopTyping = useCallback(() => {
    if (!chatId) return;

    setIsSelfTyping(false);

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;

      const payload = {
        chatId,
        user: {
          id: currentUserId,
          name: currentUserName
        },
        isTyping: false
      };

      if (socket) {
        socket.emit("chat:typing_stop", payload);
      }

      fetch("/api/socket/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  }, [socket, chatId, currentUserId, currentUserName]);

  // Stop typing on unmount or chat change
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [chatId, stopTyping]);

  return {
    typingUsers,
    isSelfTyping,
    startTyping,
    stopTyping
  };
}
