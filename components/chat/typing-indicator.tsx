"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  typingUsers: Array<{ id: string; name: string }>;
  className?: string;
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) {
    return (
      <div className={cn("h-6 px-4 py-0.5 flex items-center opacity-0 pointer-events-none transition-opacity duration-150", className)}>
        <span className="text-xs">&nbsp;</span>
      </div>
    );
  }

  const renderTypingText = () => {
    const count = typingUsers.length;

    if (count === 1) {
      return (
        <span>
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            {typingUsers[0].name}
          </strong>{" "}
          is typing...
        </span>
      );
    }

    if (count === 2) {
      return (
        <span>
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            {typingUsers[0].name}
          </strong>{" "}
          and{" "}
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            {typingUsers[1].name}
          </strong>{" "}
          are typing...
        </span>
      );
    }

    if (count === 3) {
      return (
        <span>
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            {typingUsers[0].name}
          </strong>
          ,{" "}
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            {typingUsers[1].name}
          </strong>{" "}
          and{" "}
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            {typingUsers[2].name}
          </strong>{" "}
          are typing...
        </span>
      );
    }

    return (
      <span>
        <strong className="font-bold text-zinc-900 dark:text-zinc-100">
          Several people
        </strong>{" "}
        are typing...
      </span>
    );
  };

  return (
    <div
      className={cn(
        "h-6 px-4 py-0.5 flex items-center gap-x-2 text-[12px] text-zinc-600 dark:text-zinc-400 select-none animate-in fade-in slide-in-from-bottom-1 duration-150",
        className
      )}
    >
      {/* 3 Animated Bouncing Discord Dots */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce"
          style={{ animationDuration: "1s", animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce"
          style={{ animationDuration: "1s", animationDelay: "180ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce"
          style={{ animationDuration: "1s", animationDelay: "360ms" }}
        />
      </div>

      <div className="truncate min-w-0">{renderTypingText()}</div>
    </div>
  );
}
