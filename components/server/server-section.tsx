"use client";

import React from "react";
import { ChannelType, MemberRole } from "@prisma/client";
import { Plus, Settings } from "lucide-react";

import { ServerWithMembersWithProfiles } from "@/types";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

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

  return (
    <div className="flex items-center justify-between py-2 px-1">
      <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-500/80 dark:text-zinc-400/80">
        {label}
      </p>
      {role !== MemberRole.GUEST && sectionType === "channels" && (
        <ActionTooltip label="Create Channel" side="top">
          <button
            onClick={() => onOpen("createChannel", { channelType })}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-200 transition p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </ActionTooltip>
      )}
      {role === MemberRole.ADMIN && sectionType === "members" && (
        <ActionTooltip label="Manage Members" side="top">
          <button
            onClick={() => onOpen("members", { server })}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-200 transition p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </ActionTooltip>
      )}
    </div>
  );
}
