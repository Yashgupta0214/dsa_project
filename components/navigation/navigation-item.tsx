"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { GradientLoader } from "@/components/ui/loader";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { useUnreadStore } from "@/hooks/use-unread-store";

interface NavigationItemProps {
  id: string;
  imageUrl: string;
  name: string;
  channelId?: string;
}

export function NavigationItem({
  id,
  imageUrl,
  name,
  channelId
}: NavigationItemProps) {
  const params = useParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  const rawUnread = useUnreadStore((state) => state.unreadByServer[id] || 0);
  const clearUnread = useUnreadStore((state) => state.clearUnread);

  const isActive = params?.serverId === id;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const unreadCount = isMounted ? rawUnread : 0;

  // Clear unread count automatically when viewing this server
  useEffect(() => {
    if (isActive && rawUnread > 0) {
      clearUnread(id);
    }
  }, [isActive, rawUnread, id, clearUnread]);

  const onClick = () => {
    clearUnread(id);
    const href = channelId
      ? `/servers/${id}/channels/${channelId}`
      : `/servers/${id}`;

    startTransition(() => {
      router.push(href);
    });
  };

  const tooltipLabel = unreadCount > 0 ? `${name} (${unreadCount} unread)` : name;

  return (
    <ActionTooltip side="right" align="center" label={tooltipLabel}>
      <button
        onClick={onClick}
        className="group relative flex items-center focus:outline-none w-full justify-center"
      >
        {/* Active/Hover/Unread Left Pill Indicator */}
        <div
          className={cn(
            "absolute left-0 rounded-r-full transition-all duration-300 ease-out",
            isActive
              ? "w-[4px] h-[36px] bg-indigo-500 dark:bg-indigo-400 opacity-100 shadow-[0_0_10px_rgba(99,102,241,0.45)]"
              : unreadCount > 0
              ? "w-[4px] h-[8px] bg-zinc-700 dark:bg-zinc-200 opacity-100 group-hover:h-[20px]"
              : "w-[3px] h-[0px] bg-indigo-500 dark:bg-indigo-400 opacity-70 group-hover:h-[18px]"
          )}
        />

        <div className="relative flex items-center justify-center">
          {/* Server Icon Container */}
          <div
            className={cn(
              "relative flex mx-3 h-[44px] w-[44px] rounded-[18px] group-hover:rounded-[14px] transition-all duration-300 ease-out overflow-hidden items-center justify-center group-hover:scale-105 active:scale-95 border border-black/5 dark:border-white/5 shadow-sm",
              isActive &&
                "rounded-[14px] ring-2 ring-indigo-500/45 ring-offset-2 ring-offset-[#eef0f3] dark:ring-offset-[#0f1014] shadow-md shadow-indigo-500/20"
            )}
          >
            <Image
              fill
              src={imageUrl}
              alt={name}
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                isPending && "opacity-40"
              )}
            />
            {isPending && (
              <GradientLoader className="absolute h-5 w-5 drop-shadow" />
            )}
          </div>

          {/* Unread Message Count Badge */}
          {unreadCount > 0 && !isActive && (
            <span
              aria-label={`${unreadCount} unread messages`}
              className="absolute -bottom-1 right-1.5 z-20 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-[#f23f43] text-white text-[10px] font-black tracking-tight shadow-md ring-2 ring-[#e3e5e8] dark:ring-[#11131a] animate-in zoom-in-75 duration-200 pointer-events-none select-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </button>
    </ActionTooltip>
  );
}

