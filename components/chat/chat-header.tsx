import React from "react";
import { Hash } from "lucide-react";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { SocketIndicatior } from "@/components/socket-indicatior";
import { ChatVideoButton } from "@/components/chat/chat-video-button";

interface ChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
}

export function ChatHeader({
  name,
  serverId,
  type,
  imageUrl
}: ChatHeaderProps) {
  return (
    <div className="text-md font-semibold px-4 flex items-center h-12 border-b border-black/5 dark:border-white/5 bg-white/75 dark:bg-[#1e1f22]/80 backdrop-blur-md sticky top-0 z-20 shadow-sm transition-colors">
      <MobileToggle serverId={serverId} />
      {type === "channel" && (
        <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 mr-2.5">
          <Hash className="w-4 h-4" />
        </div>
      )}
      {type === "conversation" && (
        <UserAvatar
          src={imageUrl}
          className="h-8 w-8 md:h-8 md:w-8 mr-2.5 ring-1 ring-black/5 dark:ring-white/10"
        />
      )}
      <p className="font-bold text-sm md:text-base tracking-tight text-zinc-800 dark:text-zinc-100">
        {name}
      </p>
      <div className="ml-auto flex items-center gap-x-3">
        {type === "conversation" && <ChatVideoButton />}
        <SocketIndicatior />
      </div>
    </div>
  );
}
