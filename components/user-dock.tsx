"use client";

import React, { useState } from "react";
import { Profile } from "@prisma/client";
import { Mic, MicOff, Headphones, Settings, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

interface UserDockProps {
  profile: Profile;
}

export function UserDock({ profile }: UserDockProps) {
  const { onOpen } = useModal();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const toggleDeafen = () => {
    setIsDeafened((prev) => {
      const next = !prev;
      if (next) setIsMuted(true);
      return next;
    });
  };

  return (
    <div className="mt-auto flex items-center justify-between px-2.5 py-2 bg-[#e3e5e8]/90 dark:bg-[#111217]/90 border-t border-black/5 dark:border-white/10 backdrop-blur-md transition-all">
      {/* User Info & Avatar */}
      <div className="flex items-center gap-x-2 overflow-hidden cursor-pointer rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 transition flex-1 min-w-0" onClick={() => onOpen("userSettings", { profile })}>
        <div className="relative flex-shrink-0">
          <UserAvatar src={profile.imageUrl} className="h-8 w-8 md:h-8 md:w-8 shadow-sm" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#e3e5e8] dark:ring-[#111217]" />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-x-1">
            <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">
              {profile.name}
            </span>
            <ShieldCheck className="h-3 w-3 text-indigo-500 flex-shrink-0" />
          </div>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
            Online
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-x-0.5 flex-shrink-0">
        <ActionTooltip side="top" label={isMuted ? "Unmute Mic" : "Mute Mic"}>
          <button
            onClick={toggleMute}
            className={`p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition ${
              isMuted ? "text-rose-500 hover:text-rose-600 bg-rose-500/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </ActionTooltip>

        <ActionTooltip side="top" label={isDeafened ? "Undeafen Audio" : "Deafen Audio"}>
          <button
            onClick={toggleDeafen}
            className={`p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition ${
              isDeafened ? "text-rose-500 hover:text-rose-600 bg-rose-500/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <Headphones className={`h-4 w-4 ${isDeafened ? "line-through" : ""}`} />
          </button>
        </ActionTooltip>

        <ActionTooltip side="top" label="User Settings">
          <button
            onClick={() => onOpen("userSettings", { profile })}
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/10 dark:hover:bg-white/10 transition"
          >
            <Settings className="h-4 w-4 hover:rotate-45 transition-transform duration-300" />
          </button>
        </ActionTooltip>
      </div>
    </div>
  );
}
