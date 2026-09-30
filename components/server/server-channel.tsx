"use client";

import React from "react";
import { Channel, ChannelType, MemberRole, Server } from "@prisma/client";
import { Edit, Hash, Lock, Mic, Trash, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { ModalType, useModal } from "@/hooks/use-modal-store";
import { useServerTemporary } from "@/hooks/use-server-temporary";
import { useUnreadStore } from "@/hooks/use-unread-store";

interface ServerChannelProps {
  channel: Channel;
  server: Server;
  role?: MemberRole;
}

const iconMap = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.AUDIO]: Mic,
  [ChannelType.VIDEO]: Video
};

export function ServerChannel({
  channel,
  server,
  role
}: ServerChannelProps) {
  const { onOpen } = useModal();
  const { isExpired } = useServerTemporary(server?.id);
  const params = useParams();
  const router = useRouter();

  const rawUnread = useUnreadStore((state) => state.unreadByChannel[channel.id] || 0);
  const clearChannelUnread = useUnreadStore((state) => state.clearChannelUnread);

  const Icon = iconMap[channel.type];
  const isActive = params?.channelId === channel.id;
  const unreadCount = !isActive ? rawUnread : 0;

  React.useEffect(() => {
    if (isActive && rawUnread > 0) {
      clearChannelUnread(channel.id);
    }
  }, [isActive, rawUnread, channel.id, clearChannelUnread]);

  const onClick = () => {
    clearChannelUnread(channel.id);
    router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
  };

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();
    onOpen(action, { channel, server });
  };

  return (
    <button
      className={cn(
        "group relative px-2 py-1.5 rounded-md flex items-center gap-x-2 w-full transition-all duration-150 focus:outline-none",
        !isActive &&
          "hover:bg-zinc-200/60 dark:hover:bg-[#35373c]/60 text-zinc-600 dark:text-[#949ba4] hover:text-zinc-900 dark:hover:text-[#dbdee1]",
        !isActive && unreadCount > 0 &&
          "text-zinc-900 dark:text-white font-semibold",
        isActive &&
          "bg-zinc-200/90 dark:bg-[#35373c] text-zinc-900 dark:text-white font-semibold shadow-sm"
      )}
      onClick={onClick}
    >
      {isActive && (
        <span className="absolute -left-2 top-1.5 bottom-1.5 w-1 rounded-r-full bg-indigo-500 dark:bg-white" />
      )}
      {!isActive && unreadCount > 0 && (
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-[4px] h-[8px] rounded-r-full bg-zinc-800 dark:bg-white" />
      )}
      <Icon
        className={cn(
          "flex-shrink-0 w-4 h-4 transition-colors",
          !isActive && unreadCount === 0 && "text-zinc-500 group-hover:text-zinc-700 dark:text-[#80848e] dark:group-hover:text-[#dbdee1]",
          !isActive && unreadCount > 0 && "text-zinc-900 dark:text-white",
          isActive && "text-indigo-600 dark:text-white"
        )}
      />
      <p
        className={cn(
          "line-clamp-1 text-[14px] tracking-tight transition-colors",
          !isActive && unreadCount === 0 && "group-hover:text-zinc-900 dark:group-hover:text-[#dbdee1]",
          !isActive && unreadCount > 0 && "font-semibold text-zinc-900 dark:text-white",
          isActive && "text-zinc-900 dark:text-white font-semibold"
        )}
      >
        {channel.name}
      </p>

      {/* Unread Badge */}
      {unreadCount > 0 && !isActive && (
        <span className="ml-auto flex min-w-[18px] h-[18px] px-1.5 items-center justify-center rounded-full bg-[#f23f43] text-white text-[11px] font-bold shadow-sm shadow-[#f23f43]/40 shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {!isExpired && channel.name !== "general" && role !== MemberRole.GUEST && (
        <div className={cn(
          "flex items-center gap-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
          unreadCount > 0 ? "hidden group-hover:flex" : "ml-auto"
        )}>
          <ActionTooltip label="Edit">
            <Edit
              onClick={(e) => onAction(e, "editChannel")}
              className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            />
          </ActionTooltip>
          <ActionTooltip label="Delete">
            <Trash
              onClick={(e) => onAction(e, "deleteChannel")}
              className="w-3.5 h-3.5 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
            />
          </ActionTooltip>
        </div>
      )}
      {(isExpired || channel.name === "general") && (
        <Lock className={cn(
          "w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500",
          unreadCount > 0 ? "hidden group-hover:block" : "ml-auto"
        )} />
      )}
    </button>
  );
}

