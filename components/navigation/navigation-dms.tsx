"use client";

import { MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";

export function NavigationDms() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname?.startsWith("/direct-messages");

  return (
    <ActionTooltip side="right" align="center" label="Direct Messages">
      <button
        type="button"
        onClick={() => router.push("/direct-messages")}
        className="group relative flex w-full items-center justify-center focus:outline-none"
      >
        <div
          className={cn(
            "absolute left-0 rounded-r-full bg-indigo-500 transition-all duration-300 ease-out dark:bg-indigo-400",
            !isActive && "h-0 w-[3px] opacity-70 group-hover:h-[18px]",
            isActive && "h-[32px] w-[3px] opacity-100"
          )}
        />
        <div
          className={cn(
            "mx-3 flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-[24px] border border-black/5 bg-zinc-200/70 transition-all duration-300 ease-out group-hover:scale-105 group-hover:rounded-[16px] group-hover:bg-indigo-500 group-hover:shadow-lg group-hover:shadow-indigo-500/25 active:scale-95 dark:border-white/5 dark:bg-neutral-800/90",
            isActive && "rounded-[16px] bg-indigo-500 shadow-md shadow-indigo-500/25"
          )}
        >
          <MessageCircle
            className={cn(
              "transition-all duration-300",
              isActive
                ? "text-white"
                : "text-indigo-500 group-hover:text-white dark:text-indigo-400"
            )}
            size={22}
          />
        </div>
      </button>
    </ActionTooltip>
  );
}
