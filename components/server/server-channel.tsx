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
        "group relative px-2.5 py-1.5 rounded-md flex items-center gap-x-2 w-full transition-all duration-150 focus:outline-none",
        !isActive &&
          "hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
        !isActive && unreadCount > 0 &&
          "text-zinc-900 dark:text-zinc-100 font-bold",
        isActive &&
          "bg-zinc-200/80 dark:bg-indigo-500/20 text-zinc-900 dark:text-indigo-300 font-semibold shadow-sm"
      )}
      onClick={onClick}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      )}
      {!isActive && unreadCount > 0 && (
        <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-2 rounded-r-full bg-zinc-800 dark:bg-white" />
      )}
      <Icon
        className={cn(
          "flex-shrink-0 w-3.5 h-3.5 transition-colors",
          !isActive && "text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200",
          !isActive && unreadCount > 0 && "text-zinc-900 dark:text-zinc-100",
          isActive && channel.type === ChannelType.TEXT && "text-indigo-600 dark:text-indigo-400",
          isActive && channel.type === ChannelType.AUDIO && "text-emerald-600 dark:text-emerald-400",
          isActive && channel.type === ChannelType.VIDEO && "text-amber-600 dark:text-amber-400"
        )}
      />
      <p
        className={cn(
          "line-clamp-1 text-[13px] tracking-tight transition-colors",
          !isActive && "group-hover:text-zinc-900 dark:group-hover:text-zinc-100",
          !isActive && unreadCount > 0 && "font-bold text-zinc-900 dark:text-white",
          isActive && "text-indigo-700 dark:text-indigo-300 font-medium"
        )}
      >
        {channel.name}
      </p>

      {/* Unread Badge */}
      {unreadCount > 0 && !isActive && (
        <span className="ml-auto flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm shadow-rose-500/30 shrink-0">
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

