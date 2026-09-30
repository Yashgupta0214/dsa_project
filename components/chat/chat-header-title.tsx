"use client";

import React from "react";
import { useChatTyping } from "@/hooks/use-chat-typing";
import { TypingIndicator } from "@/components/chat/typing-indicator";

interface ChatHeaderTitleProps {
  name: string;
  chatId: string;
}

export function ChatHeaderTitle({ name, chatId }: ChatHeaderTitleProps) {
  const { typingUsers } = useChatTyping({ chatId });

  return (
    <div className="flex flex-col justify-center min-w-0 mr-2">
      <p className="font-bold text-sm tracking-tight text-zinc-800 dark:text-zinc-100 truncate">
        {name}
      </p>
      {typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} variant="header" />
      )}
    </div>
  );
}
