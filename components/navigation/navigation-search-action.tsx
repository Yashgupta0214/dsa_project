"use client";

import React, { useEffect } from "react";
import { Search } from "lucide-react";
import { Server } from "@prisma/client";

import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

interface NavigationSearchActionProps {
  servers: Server[];
}

export function NavigationSearchAction({ servers }: NavigationSearchActionProps) {
  const { onOpen } = useModal();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        onOpen("searchServers", { servers });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpen, servers]);

  return (
    <div>
      <ActionTooltip side="right" align="center" label="Search Servers (Ctrl+F)">
        <button
          onClick={() => onOpen("searchServers", { servers })}
          className="group flex items-center focus:outline-none"
        >
          <div className="flex mx-3 h-[44px] w-[44px] rounded-[22px] group-hover:rounded-[14px] transition-all duration-300 ease-out overflow-hidden items-center justify-center bg-zinc-200/70 dark:bg-neutral-800/90 group-hover:bg-gradient-to-tr group-hover:from-cyan-500 group-hover:to-blue-500 group-hover:shadow-lg group-hover:shadow-cyan-500/25 group-hover:scale-105 active:scale-95 border border-black/5 dark:border-white/5">
            <Search
              className="transition-all duration-300 text-cyan-600 dark:text-cyan-400 group-hover:text-white"
              size={19}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
}
