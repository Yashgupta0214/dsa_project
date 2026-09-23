"use client";

import React, { useEffect, useState } from "react";
import { Profile } from "@prisma/client";
import {
  Headphones,
  Mic,
  MicOff,
  Moon,
  Settings,
  VolumeX
} from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

interface UserFooterProps {
  profile: Profile;
}

export function UserFooter({ profile }: UserFooterProps) {
  const { onOpen } = useModal();

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [presence, setPresence] = useState<"online" | "idle" | "dnd" | "invisible">("idle");
  const [customStatus, setCustomStatus] = useState("Idle");

  const loadStatus = () => {
    const savedPresence = (localStorage.getItem("user_presence_status") as any) || "idle";
    const savedCustom = localStorage.getItem("user_custom_status");
    setPresence(savedPresence);
    setCustomStatus(savedCustom || (savedPresence === "dnd" ? "Do Not Disturb" : savedPresence === "idle" ? "Idle" : "Online"));
  };

  useEffect(() => {
    loadStatus();
    const handleStatusChange = () => loadStatus();
    window.addEventListener("user_status_changed", handleStatusChange);
    return () => window.removeEventListener("user_status_changed", handleStatusChange);
  }, []);

  const toggleMic = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  const toggleDeafen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeafened((prev) => {
      const next = !prev;
      if (next) setIsMuted(true);
      return next;
    });
  };

  const openProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen("editProfile", { profile });
  };

  const openSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen("userSettings", { profile });
  };

  return (
    <div className="flex items-center justify-between p-2 mt-auto bg-[#e3e5e8]/80 dark:bg-[#111214] border-t border-black/5 dark:border-white/5 transition-colors duration-200">
      {/* User Info Section */}
      <button
        onClick={openProfile}
        className="flex items-center gap-x-2 py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/[0.06] transition text-left group min-w-0 max-w-[130px] flex-1"
      >
        <div className="relative flex-shrink-0">
          <UserAvatar
            src={profile.imageUrl}
            className="h-8 w-8 md:h-8 md:w-8 ring-1 ring-black/10 dark:ring-white/10"
          />
          {/* Status Badge */}
          {presence === "idle" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#2b2d31] flex items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 flex items-center justify-center text-[8px] text-zinc-900 font-bold">
                🌙
              </span>
            </span>
          )}
          {presence === "online" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#2b2d31] flex items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
            </span>
          )}
          {presence === "dnd" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#2b2d31] flex items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          )}
          {presence === "invisible" && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#2b2d31] flex items-center justify-center">
              <span className="h-2.5 w-2.5 rounded-full border border-zinc-400 bg-zinc-600" />
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:underline">
            {profile.name}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {customStatus}
          </span>
        </div>
      </button>

      {/* Action Controls: Mic, Deafen, Settings */}
      <div className="flex items-center gap-x-0.5 flex-shrink-0">
        <ActionTooltip label={isMuted ? "Unmute" : "Mute"}>
          <button
            onClick={toggleMic}
            className={`p-1.5 rounded-md transition ${
              isMuted
                ? "text-rose-500 hover:bg-rose-500/10"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4 text-rose-500" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </ActionTooltip>

        <ActionTooltip label={isDeafened ? "Undeafen" : "Deafen"}>
          <button
            onClick={toggleDeafen}
            className={`p-1.5 rounded-md transition ${
              isDeafened
                ? "text-rose-500 hover:bg-rose-500/10"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            {isDeafened ? (
              <VolumeX className="h-4 w-4 text-rose-500" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </button>
        </ActionTooltip>

        <ActionTooltip label="User Settings (Notifications, Theme & Audio)">
          <button
            onClick={openSettings}
            className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-200 transition"
          >
            <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform" />
          </button>
        </ActionTooltip>
      </div>
    </div>
  );
}
