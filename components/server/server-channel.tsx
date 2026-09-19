"use client";

import React from "react";
import { Channel, ChannelType, MemberRole, Server } from "@prisma/client";
import { Edit, Hash, Lock, Mic, Trash, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { ModalType, useModal } from "@/hooks/use-modal-store";

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
  const params = useParams();
  const router = useRouter();

  const Icon = iconMap[channel.type];
  const isActive = params?.channelId === channel.id;

  const onClick = () =>
    router.push(`/servers/${params?.serverId}/channels/${channel.id}`);

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();
    onOpen(action, { channel, server });
  };

  return (
    <button
      className={cn(
        "group relative px-2.5 py-1.5 rounded-md flex items-center gap-x-2 w-full transition-all duration-150 focus:outline-none",
        !isActive &&
          "hover:bg-zinc-200/60 dark:hover:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
        isActive &&
          "bg-indigo-500/10 dark:bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 font-semibold"
      )}
      onClick={onClick}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      )}
      <Icon
        className={cn(
          "flex-shrink-0 w-3.5 h-3.5 transition-colors",
          !isActive && "text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-300",
          isActive && channel.type === ChannelType.TEXT && "text-indigo-500 dark:text-indigo-400",
          isActive && channel.type === ChannelType.AUDIO && "text-emerald-500 dark:text-emerald-400",
          isActive && channel.type === ChannelType.VIDEO && "text-amber-500 dark:text-amber-400"
        )}
      />
      <p
        className={cn(
          "line-clamp-1 text-[13px] tracking-tight transition-colors",
          !isActive && "group-hover:text-zinc-700 dark:group-hover:text-zinc-200",
          isActive && "text-indigo-600 dark:text-indigo-300 font-medium"
        )}
      >
        {channel.name}
      </p>
      {channel.name !== "general" && role !== MemberRole.GUEST && (
        <div className="ml-auto flex items-center gap-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionTooltip label="Edit">
            <Edit
              onClick={(e) => onAction(e, "editChannel")}
              className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-200 transition"
            />
          </ActionTooltip>
          <ActionTooltip label="Delete">
            <Trash
              onClick={(e) => onAction(e, "deleteChannel")}
              className="w-3.5 h-3.5 text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition"
            />
          </ActionTooltip>
        </div>
      )}
      {channel.name === "general" && (
        <Lock className="ml-auto w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
      )}
    </button>
  );
}
