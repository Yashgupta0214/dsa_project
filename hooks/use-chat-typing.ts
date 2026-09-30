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
  const lastEmitTimeRef = useRef(0);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Someone";

  const currentUserId = user?.id || "anonymous";

  // Listen to typing events for this specific chat
  useEffect(() => {
    if (!socket || !chatId) return;

    const eventKey = `chat:${chatId}:typing`;

    const handleTypingEvent = (data: {
      user: { id: string; name: string };
      socketId?: string;
      isTyping: boolean;
    }) => {
      if (!data?.user) return;

      // Filter out this exact client socket so the sender doesn't see their own typing indicator
      if (data.socketId ? data.socketId === socket.id : (data.user?.id === currentUserId && !data.socketId)) {
        return;
      }

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
      const now = Date.now();
      setTypingUsers((prev) => {
        const active = prev.filter((u) => now - u.lastTypedAt < 3500);
        return active.length === prev.length ? prev : active;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

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
      lastEmitTimeRef.current = 0;

      const payload = {
        chatId,
        user: {
          id: currentUserId,
          name: currentUserName
        },
        socketId: socket?.id,
        isTyping: false
      };

      if (socket?.connected) {
        socket.emit("chat:typing_stop", payload);
      } else {
        fetch("/api/socket/typing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    }
  }, [socket, chatId, currentUserId, currentUserName]);

  // Send typing start notification (via Socket or HTTP API fallback)
  const startTyping = useCallback(() => {
    if (!chatId) return;

    setIsSelfTyping(true);
    const now = Date.now();

    // Emit if not currently marked as typing or if 1.5s has elapsed (heartbeat refresh)
    if (!isTypingRef.current || now - lastEmitTimeRef.current > 1500) {
      isTypingRef.current = true;
      lastEmitTimeRef.current = now;

      const payload = {
        chatId,
        user: {
          id: currentUserId,
          name: currentUserName
        },
        socketId: socket?.id,
        isTyping: true
      };

      if (socket?.connected) {
        socket.emit("chat:typing_start", payload);
      } else {
        fetch("/api/socket/typing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {});
      }
    }

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    stopTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2500);
  }, [socket, chatId, currentUserId, currentUserName, stopTyping]);

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
