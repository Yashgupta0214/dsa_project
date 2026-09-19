"use client";

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";

interface NavigationItemProps {
  id: string;
  imageUrl: string;
  name: string;
}

export function NavigationItem({ id, imageUrl, name }: NavigationItemProps) {
  const params = useParams();
  const router = useRouter();

  const isActive = params?.serverId === id;

  const onClick = () => {
    router.push(`/servers/${id}`);
  };

  return (
    <ActionTooltip side="right" align="center" label={name}>
      <button
        onClick={onClick}
        className="group relative flex items-center focus:outline-none w-full justify-center"
      >
        {/* Active/Hover Left Pill Indicator */}
        <div
          className={cn(
            "absolute left-0 bg-indigo-500 dark:bg-indigo-400 rounded-r-full transition-all duration-300 ease-out",
            !isActive && "w-[3px] h-[0px] group-hover:h-[18px] opacity-70",
            isActive && "w-[3px] h-[32px] opacity-100 shadow-[0_0_10px_rgba(99,102,241,0.45)]"
          )}
        />

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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </button>
    </ActionTooltip>
  );
}
