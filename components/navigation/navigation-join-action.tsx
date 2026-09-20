"use client";

import React from "react";
import { Compass } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

export function NavigationJoinAction() {
  const { onOpen } = useModal();

  return (
    <div>
      <ActionTooltip side="right" align="center" label="Join a Server">
        <button
          onClick={() => onOpen("joinServer")}
          className="group flex items-center focus:outline-none"
        >
          <div className="flex mx-3 h-[44px] w-[44px] rounded-[22px] group-hover:rounded-[14px] transition-all duration-300 ease-out overflow-hidden items-center justify-center bg-zinc-200/70 dark:bg-neutral-800/90 group-hover:bg-gradient-to-tr group-hover:from-indigo-500 group-hover:to-purple-500 group-hover:shadow-lg group-hover:shadow-indigo-500/25 group-hover:scale-105 active:scale-95 border border-black/5 dark:border-white/5">
            <Compass
              className="transition-all duration-300 text-indigo-500 dark:text-indigo-400 group-hover:text-white group-hover:rotate-45"
              size={20}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
}
