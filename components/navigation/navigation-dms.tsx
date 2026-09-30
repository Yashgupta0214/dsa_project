"use client";

import { MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import { useUnreadStore } from "@/hooks/use-unread-store";

export function NavigationDms() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const unreadByMember = useUnreadStore((state) => state.unreadByMember);
  const unreadByConversation = useUnreadStore((state) => state.unreadByConversation);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalDmsUnread = isMounted
    ? Object.values(unreadByMember).reduce((acc, curr) => acc + (curr || 0), 0) +
      Object.values(unreadByConversation).reduce((acc, curr) => acc + (curr || 0), 0)
    : 0;

  const isActive = pathname?.startsWith("/direct-messages");

  const tooltipLabel =
    totalDmsUnread > 0 ? `Direct Messages (${totalDmsUnread} unread)` : "Direct Messages";

  return (
    <ActionTooltip side="right" align="center" label={tooltipLabel}>
      <button
        type="button"
        onClick={() => router.push("/direct-messages")}
        className="group relative flex w-full items-center justify-center focus:outline-none"
      >
        <div
          className={cn(
            "absolute left-0 rounded-r-full bg-indigo-500 transition-all duration-300 ease-out dark:bg-indigo-400",
            !isActive && totalDmsUnread === 0 && "h-0 w-[3px] opacity-70 group-hover:h-[18px]",
            !isActive && totalDmsUnread > 0 && "h-[8px] w-[4px] opacity-100 group-hover:h-[20px] bg-zinc-700 dark:bg-zinc-200",
            isActive && "h-[32px] w-[3px] opacity-100"
          )}
        />
        <div className="relative flex items-center justify-center">
          <div
            className={cn(
              "mx-3 flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-[18px] border border-black/5 bg-zinc-200/70 transition-all duration-300 ease-out group-hover:scale-105 group-hover:rounded-[14px] group-hover:bg-indigo-500 group-hover:shadow-lg group-hover:shadow-indigo-500/25 active:scale-95 dark:border-white/5 dark:bg-neutral-800/90",
              isActive && "rounded-[14px] bg-indigo-500 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/45 ring-offset-2 ring-offset-[#eef0f3] dark:ring-offset-[#0f1014]"
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

          {/* Total Unread DM Badge */}
          {totalDmsUnread > 0 && !isActive && (
            <span
              aria-label={`${totalDmsUnread} unread direct messages`}
              className="absolute -top-1 right-1.5 z-20 flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 dark:bg-rose-600 text-white text-[10px] font-black tracking-tight shadow-md shadow-rose-500/40 ring-2 ring-[#e3e5e8] dark:ring-[#11131a] animate-in zoom-in-75 duration-200 pointer-events-none select-none"
            >
              {totalDmsUnread > 99 ? "99+" : totalDmsUnread}
            </span>
          )}
        </div>
      </button>
    </ActionTooltip>
  );
}
