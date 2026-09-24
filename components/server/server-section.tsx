"use client";

import React from "react";
import { ChannelType, MemberRole } from "@prisma/client";
import { Plus, Settings } from "lucide-react";

import { ServerWithMembersWithProfiles } from "@/types";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { useServerTemporary } from "@/hooks/use-server-temporary";

interface ServerSectionProps {
  label: string;
  role?: MemberRole;
  sectionType: "channels" | "members";
  channelType?: ChannelType;
  server?: ServerWithMembersWithProfiles;
}

export function ServerSection({
  channelType,
  label,
  sectionType,
  role,
  server
}: ServerSectionProps) {
  const { onOpen } = useModal();
  const { isExpired } = useServerTemporary(server?.id);

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      {!isExpired && role !== MemberRole.GUEST && sectionType === "channels" && (
        <ActionTooltip label="Create Channel" side="top">
          <button
            onClick={() => onOpen("createChannel", { channelType })}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </ActionTooltip>
      )}
      {!isExpired && role === MemberRole.ADMIN && sectionType === "members" && (
        <ActionTooltip label="Manage Members" side="top">
          <button
            onClick={() => onOpen("members", { server })}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </ActionTooltip>
      )}
    </div>
  );
}

