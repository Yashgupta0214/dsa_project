import React from "react";
import { Hash, Sparkles } from "lucide-react";

interface ChatWelcomeProps {
  name: string;
  type: "channel" | "conversation";
}

export function ChatWelcome({ name, type }: ChatWelcomeProps) {
  return (
    <div className="space-y-3 px-4 mb-6 pt-4">
      {type === "channel" && (
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Hash className="h-9 w-9 text-white" />
        </div>
      )}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 mb-1">
          <Sparkles className="w-3 h-3" />
          {type === "channel" ? "Channel Created" : "Direct Message"}
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {type === "channel" ? "Welcome to #" : ""}
          {name}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed max-w-lg">
          {type === "channel"
            ? `This is the beginning of the #${name} channel. Send messages, share attachments, or start a discussion!`
            : `This is the start of your direct conversation with ${name}. Say hi!`}
        </p>
      </div>
    </div>
  );
}
