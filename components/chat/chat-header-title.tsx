"use client";

import React from "react";
import { useChatTyping } from "@/hooks/use-chat-typing";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ActionTooltip } from "@/components/action-tooltip";

interface ChatHeaderTitleProps {
  name: string;
  chatId: string;
  type?: "channel" | "conversation";
}

export function ChatHeaderTitle({ name, chatId, type = "channel" }: ChatHeaderTitleProps) {
  const { typingUsers } = useChatTyping({ chatId });
  const { activeCount, activeUsers } = useChatPresence({ chatId });

  const activeLabel =
    activeUsers.length > 0
      ? `Active now: ${activeUsers.map((u) => u.name).join(", ")}`
      : `${activeCount} ${activeCount === 1 ? "participant" : "participants"} active in this ${type}`;

  return (
    <div className="flex flex-col justify-center min-w-0 mr-2 py-0.5">
      <p className="font-bold text-sm leading-snug tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
        {name}
      </p>

      <div className="flex items-center gap-x-1.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400 font-medium select-none mt-0.5">
        {/* Active Participants Count with Live Emerald Pulse Dot */}
        <ActionTooltip side="bottom" label={activeLabel}>
          <div className="inline-flex items-center gap-x-1.5 cursor-default hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors shrink-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="truncate">
              {activeCount} {activeCount === 1 ? "participant active" : "participants active"}
            </span>
          </div>
        </ActionTooltip>

        {/* Live Typing Indicator */}
        {typingUsers.length > 0 && (
          <>
            <span className="text-zinc-400 dark:text-zinc-600 shrink-0">•</span>
            <TypingIndicator typingUsers={typingUsers} variant="header" />
          </>
        )}
      </div>
    </div>
  );
}
