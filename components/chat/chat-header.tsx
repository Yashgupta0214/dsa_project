import React from "react";
import { Hash } from "lucide-react";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { SocketIndicatior } from "@/components/socket-indicatior";
import { ChatVideoButton } from "@/components/chat/chat-video-button";
import { PinnedMessagesPopover } from "@/components/chat/pinned-messages-popover";

interface ChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
  chatId?: string;
  socketUrl?: string;
  socketQuery?: Record<string, string>;
}

export function ChatHeader({
  name,
  serverId,
  type,
  imageUrl,
  chatId,
  socketUrl = type === "channel" ? "/api/socket/messages" : "/api/socket/direct-messages",
  socketQuery = type === "channel"
    ? { channelId: chatId || "", serverId }
    : { conversationId: chatId || "" }
}: ChatHeaderProps) {
  return (
    <div className="text-md font-semibold mx-3 mt-3 mb-2 px-3.5 flex items-center h-12 rounded-xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#1b1d25]/75 backdrop-blur-xl sticky top-3 z-20 shadow-sm dark:shadow-black/25 transition-colors">
      <MobileToggle serverId={serverId} />
      {type === "channel" && (
        <div className="p-1.5 rounded-lg bg-indigo-500 text-white mr-2 shadow-sm shadow-indigo-500/30">
          <Hash className="w-3.5 h-3.5" />
        </div>
      )}
      {type === "conversation" && (
        <UserAvatar
          src={imageUrl}
          className="h-7 w-7 md:h-7 md:w-7 mr-2 ring-1 ring-black/5 dark:ring-white/10"
        />
      )}
      <p className="font-bold text-sm tracking-tight text-zinc-800 dark:text-zinc-100">
        {name}
      </p>
      <div className="ml-auto flex items-center gap-x-2">
        {type === "conversation" && <ChatVideoButton />}
        {chatId && (
          <PinnedMessagesPopover
            chatId={chatId}
            type={type}
            socketUrl={socketUrl}
            socketQuery={socketQuery}
          />
        )}
        <SocketIndicatior />
      </div>
    </div>
  );
}
