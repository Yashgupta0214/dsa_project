"use client";

import React from "react";
import { MemberRole } from "@prisma/client";
import {
  ChevronDown,
  LogOutIcon,
  PlusCircle,
  Settings,
  Timer,
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
import { useServerTemporary } from "@/hooks/use-server-temporary";

interface ServerHeaderProps {
  server: ServerWithMembersWithProfiles;
  role?: MemberRole;
}

export function ServerHeader({ server, role }: ServerHeaderProps) {
  const { onOpen } = useModal();
  const { isExpired, extendLifespan } = useServerTemporary(server.id);
  const [accentTheme, setAccentTheme] = React.useState("indigo");
  const [description, setDescription] = React.useState("");
  const [isTemporary, setIsTemporary] = React.useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = React.useState<number | null>(null);
  const [expiryAction, setExpiryAction] = React.useState<"archive" | "delete">("archive");
  const [tempCountdown, setTempCountdown] = React.useState("");

  const loadSettings = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(`server_settings_${server.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.accentTheme) setAccentTheme(parsed.accentTheme);
        if (parsed.description !== undefined) setDescription(parsed.description);
        if (parsed.isTemporary !== undefined) setIsTemporary(parsed.isTemporary);
        if (parsed.expiryTimestamp !== undefined) setExpiryTimestamp(parsed.expiryTimestamp);
        if (parsed.expiryAction !== undefined) setExpiryAction(parsed.expiryAction);
      }
    } catch (err) {
      console.error(err);
    }
  }, [server.id]);

  React.useEffect(() => {
    loadSettings();

    const handleUpdate = (e: any) => {
      if (e?.detail?.serverId === server.id) {
        if (e.detail.accentTheme) setAccentTheme(e.detail.accentTheme);
        if (e.detail.description !== undefined) setDescription(e.detail.description);
        if (e.detail.isTemporary !== undefined) setIsTemporary(e.detail.isTemporary);
        if (e.detail.expiryTimestamp !== undefined) setExpiryTimestamp(e.detail.expiryTimestamp);
        if (e.detail.expiryAction !== undefined) setExpiryAction(e.detail.expiryAction);
      } else {
        loadSettings();
      }
    };

    window.addEventListener("server_settings_changed", handleUpdate);
    return () => window.removeEventListener("server_settings_changed", handleUpdate);
  }, [server.id, loadSettings]);

  // Live Temp Countdown Calculation
  React.useEffect(() => {
    if (!isTemporary || !expiryTimestamp) {
      setTempCountdown("");
      return;
    }

    const updateBadge = () => {
      const diff = expiryTimestamp - Date.now();
      if (diff <= 0) {
        setTempCountdown(expiryAction === "archive" ? "🔒 Archived" : "⚠️ Expired");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTempCountdown(`⏱️ ${days}d ${hours}h left`);
      } else {
        setTempCountdown(`⏱️ ${hours}h ${mins}m left`);
      }
    };

    updateBadge();
    const interval = setInterval(updateBadge, 10000);
    return () => clearInterval(interval);
  }, [isTemporary, expiryTimestamp, expiryAction]);

  const isAdmin = role === MemberRole.ADMIN;
  const isModerator = isAdmin || role === MemberRole.MODERATOR;

  const accentColorMap: Record<string, string> = {
    indigo: "bg-indigo-500 shadow-indigo-500/50",
    emerald: "bg-emerald-500 shadow-emerald-500/50",
    rose: "bg-rose-500 shadow-rose-500/50",
    amber: "bg-amber-500 shadow-amber-500/50",
    cyan: "bg-cyan-500 shadow-cyan-500/50"
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none" asChild>
        <button className="w-full font-bold text-sm px-3.5 flex items-center h-12 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] hover:bg-white/90 dark:hover:bg-white/[0.08] transition-colors duration-200 text-zinc-800 dark:text-zinc-100 backdrop-blur-sm group">
          <span className={`h-2.5 w-2.5 rounded-full mr-2.5 shadow-sm ${accentColorMap[accentTheme] || accentColorMap.indigo}`} />
          <div className="flex flex-col text-left truncate min-w-0 flex-1">
            <div className="flex items-center gap-x-1.5">
              <span className="truncate leading-tight">{server.name}</span>
              {isTemporary && tempCountdown && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  {tempCountdown}
                </span>
              )}
            </div>
            {description && (
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal truncate">
                {description}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-auto text-zinc-500 dark:text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 text-xs font-medium rounded-xl p-1.5 shadow-2xl space-y-1 bg-white/95 dark:bg-[#1e1f22]/95 backdrop-blur-xl border border-black/10 dark:border-white/10">
        {/* Always Available Extension Action */}
        {(isTemporary || isExpired) && (
          <DropdownMenuItem
            onClick={() => extendLifespan(1)}
            className="text-amber-600 dark:text-amber-400 px-3 py-2 text-xs font-bold cursor-pointer rounded-lg hover:bg-amber-500/10 transition"
          >
            Extend Lifespan (+1 Day)
            <Timer className="h-4 w-4 ml-auto text-amber-500" />
          </DropdownMenuItem>
        )}

        {!isExpired && isModerator && (
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
        {!isExpired && isAdmin && (
          <DropdownMenuItem
            onClick={() => onOpen("members", { server })}
            className="px-3 py-2 text-xs cursor-pointer rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Manage Members
            <Users className="h-4 w-4 ml-auto text-zinc-400" />
          </DropdownMenuItem>
        )}
        {!isExpired && isModerator && (
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
        {!isExpired && isAdmin && (
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

