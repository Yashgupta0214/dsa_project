"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  typingUsers?: Array<{ id: string; name: string }>;
  isSelfTyping?: boolean;
  className?: string;
  variant?: "floating" | "header" | "inline";
}

export function TypingIndicator({
  typingUsers = [],
  isSelfTyping = false,
  className,
  variant = "floating"
}: TypingIndicatorProps) {
  const hasOthersTyping = typingUsers.length > 0;
  const isAnyTyping = hasOthersTyping || isSelfTyping;

  if (!isAnyTyping) {
    return null;
  }

  const renderTypingText = () => {
    if (hasOthersTyping) {
      const count = typingUsers.length;

      if (count === 1) {
        return (
          <span className="truncate">
            <strong className="font-bold text-zinc-900 dark:text-zinc-100">
              {typingUsers[0].name}
            </strong>{" "}
            is <span className="text-emerald-500 dark:text-emerald-400 font-semibold italic">typing...</span>
          </span>
        );
      }

      if (count === 2) {
        return (
          <span className="truncate">
            <strong className="font-bold text-zinc-900 dark:text-zinc-100">
              {typingUsers[0].name}
            </strong>{" "}
            and{" "}
            <strong className="font-bold text-zinc-900 dark:text-zinc-100">
              {typingUsers[1].name}
            </strong>{" "}
            are <span className="text-emerald-500 dark:text-emerald-400 font-semibold italic">typing...</span>
          </span>
        );
      }

      return (
        <span className="truncate">
          <strong className="font-bold text-zinc-900 dark:text-zinc-100">
            Several people
          </strong>{" "}
          are <span className="text-emerald-500 dark:text-emerald-400 font-semibold italic">typing...</span>
        </span>
      );
    }

    // Local self-typing preview
    return (
      <span className="truncate text-emerald-500 dark:text-emerald-400 font-semibold italic">
        typing...
      </span>
    );
  };

  if (variant === "header") {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400 font-medium animate-in fade-in duration-200", className)}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="italic">{renderTypingText()}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-x-2 px-3 py-1 mb-1.5 w-fit max-w-[90%] rounded-full bg-zinc-100/95 dark:bg-[#18191c]/95 border border-emerald-500/35 dark:border-emerald-500/40 text-xs text-zinc-700 dark:text-zinc-200 shadow-md backdrop-blur-md select-none animate-in fade-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      {/* WhatsApp 3 Jumping Emerald Wave Dots */}
      <div className="flex items-center gap-1 shrink-0 px-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce"
          style={{ animationDuration: "0.8s", animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce"
          style={{ animationDuration: "0.8s", animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-bounce"
          style={{ animationDuration: "0.8s", animationDelay: "300ms" }}
        />
      </div>

      <div className="truncate min-w-0 pr-1">{renderTypingText()}</div>
    </div>
  );
}
