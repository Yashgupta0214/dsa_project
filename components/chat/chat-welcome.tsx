import React from "react";
import { Hash } from "lucide-react";

interface ChatWelcomeProps {
  name: string;
  type: "channel" | "conversation";
}

export function ChatWelcome({ name, type }: ChatWelcomeProps) {
  return (
    <div className="mx-3 mb-3 mt-1 rounded-2xl border border-white/60 bg-white/45 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.045]">
      {type === "channel" && (
        <div className="mb-2 h-11 w-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Hash className="h-6 w-6 text-white" />
        </div>
      )}
      <div className="space-y-0.5">
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          {type === "channel" ? "Welcome to #" : ""}
          {name}
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-snug max-w-lg">
          {type === "channel"
            ? `This is the beginning of the #${name} channel. Send messages, share attachments, or start a discussion!`
            : `This is the start of your direct conversation with ${name}. Say hi!`}
        </p>
      </div>
    </div>
  );
}
