"use client";

import React from "react";
import { Plus } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

export function NavigationAction() {
  const { onOpen } = useModal();

  return (
    <div>
      <ActionTooltip side="right" align="center" label="Add a server">
        <button
          onClick={() => onOpen("createServer")}
          className="group flex items-center focus:outline-none"
        >
          <div className="flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] transition-all duration-300 ease-out overflow-hidden items-center justify-center bg-zinc-200/70 dark:bg-neutral-800/90 group-hover:bg-gradient-to-tr group-hover:from-emerald-500 group-hover:to-teal-400 group-hover:shadow-lg group-hover:shadow-emerald-500/25 group-hover:scale-105 active:scale-95 border border-black/5 dark:border-white/5">
            <Plus
              className="transition-all duration-300 text-emerald-500 dark:text-emerald-400 group-hover:text-white group-hover:rotate-90"
              size={22}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
}
