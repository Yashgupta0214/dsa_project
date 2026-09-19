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
            "absolute left-0 bg-indigo-500 dark:bg-white rounded-r-full transition-all duration-300 ease-out",
            !isActive && "w-[4px] h-[0px] group-hover:h-[20px] opacity-70",
            isActive && "w-[4px] h-[36px] opacity-100 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
          )}
        />

        {/* Server Icon Container */}
        <div
          className={cn(
            "relative flex mx-3 h-[48px] w-[48px] rounded-[24px] group-hover:rounded-[16px] transition-all duration-300 ease-out overflow-hidden items-center justify-center group-hover:scale-105 active:scale-95 border border-black/5 dark:border-white/5",
            isActive &&
              "rounded-[16px] ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-[#e3e5e8] dark:ring-offset-[#18191c] shadow-md shadow-indigo-500/20"
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
