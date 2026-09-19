"use client";

import React from "react";
import { MemberRole } from "@prisma/client";
import {
  ChevronDown,
  LogOutIcon,
  PlusCircle,
  Settings,
  Trash,
  UserPlus,
  Users
} from "lucide-react";

import { ServerWithMembersWithProfiles } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";

interface ServerHeaderProps {
  server: ServerWithMembersWithProfiles;
  role?: MemberRole;
}

export function ServerHeader({ server, role }: ServerHeaderProps) {
  const { onOpen } = useModal();

  const isAdmin = role === MemberRole.ADMIN;
  const isModerator = isAdmin || role === MemberRole.MODERATOR;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none" asChild>
        <button className="w-full font-bold text-sm px-3.5 flex items-center h-12 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/[0.045] hover:bg-white/90 dark:hover:bg-white/[0.07] transition-colors duration-200 text-zinc-800 dark:text-zinc-100">
          <span className="truncate">{server.name}</span>
          <ChevronDown className="h-4 w-4 ml-auto text-zinc-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 text-xs font-medium rounded-xl p-1.5 shadow-2xl space-y-1 bg-white/95 dark:bg-[#1e1f22]/95 backdrop-blur-xl border border-black/10 dark:border-white/10">
        {isModerator && (
          <DropdownMenuItem
            onClick={() => onOpen("invite", { server })}
            className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-xs font-semibold cursor-pointer rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
          >
            Invite People
            <UserPlus className="h-4 w-4 ml-auto text-indigo-500" />
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("editServer", { server })}
            className="px-3 py-2 text-xs cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Server Settings
            <Settings className="h-4 w-4 ml-auto text-zinc-400" />
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("members", { server })}
            className="px-3 py-2 text-xs cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Manage Members
            <Users className="h-4 w-4 ml-auto text-zinc-400" />
          </DropdownMenuItem>
        )}
        {isModerator && (
          <DropdownMenuItem
            onClick={() => onOpen("createChannel")}
            className="px-3 py-2 text-xs cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Create Channel
            <PlusCircle className="h-4 w-4 ml-auto text-zinc-400" />
          </DropdownMenuItem>
        )}
        {isModerator && (
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
        )}
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("deleteServer", { server })}
            className="px-3 py-2 text-xs cursor-pointer text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
          >
            Delete Server
            <Trash className="h-4 w-4 ml-auto text-rose-500" />
          </DropdownMenuItem>
        )}
        {!isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("leaveServer", { server })}
            className="px-3 py-2 text-xs cursor-pointer text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
          >
            Leave Server
            <LogOutIcon className="h-4 w-4 ml-auto text-rose-500" />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
