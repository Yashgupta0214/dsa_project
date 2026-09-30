import React from "react";
import { Hash } from "lucide-react";

import { MobileToggle } from "@/components/mobile-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { SocketIndicatior } from "@/components/socket-indicatior";
import { ChatVideoButton } from "@/components/chat/chat-video-button";
import { PinnedMessagesPopover } from "@/components/chat/pinned-messages-popover";
import { ChatSummaryButton } from "@/components/chat/chat-summary-button";
import { ChatSearch } from "@/components/chat/chat-search";
import { ChatHeaderTitle } from "@/components/chat/chat-header-title";

interface ChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
  chatId?: string;
  socketUrl?: string;
  socketQuery?: Record<string, string>;
  conversationId?: string;
  currentMemberId?: string;
  otherMemberId?: string;
  otherUserId?: string;
  otherProfileId?: string;
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
    : { conversationId: chatId || "" },
  conversationId,
  currentMemberId,
  otherMemberId,
  otherUserId,
  otherProfileId
}: ChatHeaderProps) {
  const activeChatId = chatId || conversationId || "";

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
      <ChatHeaderTitle name={name} chatId={activeChatId} />
      <div className="ml-auto flex items-center gap-x-2">
        {type === "conversation" && (
          <ChatVideoButton
            conversationId={conversationId || chatId}
            serverId={serverId}
            currentMemberId={currentMemberId}
            otherMemberId={otherMemberId}
            otherUserId={otherUserId}
            otherProfileId={otherProfileId}
            otherMemberName={name}
            otherMemberAvatar={imageUrl}
          />
        )}
        {activeChatId && (
          <ChatSearch
            chatId={activeChatId}
            name={name}
            type={type}
          />
        )}
        {activeChatId && (
          <ChatSummaryButton
            chatId={activeChatId}
            name={name}
            type={type}
          />
        )}
        {activeChatId && (
          <PinnedMessagesPopover
            chatId={activeChatId}
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
