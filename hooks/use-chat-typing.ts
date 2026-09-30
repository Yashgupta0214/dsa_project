"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { useUser } from "@clerk/nextjs";

interface TypingUser {
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
  const isTypingRef = useRef(false);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Someone";

  const currentUserId = user?.id;

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

  // Clean up stale typing indicators (older than 4 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const active = prev.filter((u) => now - u.lastTypedAt < 4000);
        return active.length === prev.length ? prev : active;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Send typing start notification
  const startTyping = useCallback(() => {
    if (!socket || !chatId || !currentUserId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("chat:typing_start", {
        chatId,
        user: {
          id: currentUserId,
          name: currentUserName
        }
      });
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
    if (!socket || !chatId || !currentUserId) return;

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("chat:typing_stop", {
        chatId,
        user: {
          id: currentUserId,
          name: currentUserName
        }
      });
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
    startTyping,
    stopTyping
  };
}
