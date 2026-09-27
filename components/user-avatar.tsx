import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";

interface StatusBadgeProps {
  status: PresenceStatus;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  ringClass?: string;
}

export function StatusBadge({
  status,
  size = "sm",
  className,
  ringClass = "ring-[#f2f3f5] dark:ring-[#111217]"
}: StatusBadgeProps) {
  if (status === "invisible") return null;

  const sizeStyles = {
    xs: "h-2 w-2 ring-[1.5px]",
    sm: "h-2.5 w-2.5 ring-2",
    md: "h-3 w-3 ring-2",
    lg: "h-3.5 w-3.5 ring-2"
  };

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 rounded-full flex items-center justify-center transition-all z-10",
        sizeStyles[size],
        ringClass,
        status === "online" && "bg-emerald-500 shadow-sm",
        status === "idle" && "bg-amber-400 shadow-sm",
        status === "dnd" && "bg-rose-500 shadow-sm",
        status === "offline" && "bg-zinc-400/80 dark:bg-zinc-600 ring-1 ring-zinc-300 dark:ring-zinc-700",
        className
      )}
    >
      {status === "idle" && size !== "xs" && (
        <span className="absolute inset-0 flex items-center justify-center text-[7px] leading-none text-zinc-900 font-bold select-none">
          🌙
        </span>
      )}
      {status === "dnd" && size !== "xs" && (
        <span className="w-1.5 h-[1.5px] bg-white rounded-full select-none" />
      )}
    </span>
  );
}

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  status?: PresenceStatus;
  showStatus?: boolean;
  statusSize?: "xs" | "sm" | "md" | "lg";
  ringClass?: string;
}

export function UserAvatar({
  src,
  name,
  className,
  status,
  showStatus = false,
  statusSize = "sm",
  ringClass
}: UserAvatarProps) {
  const initial = name?.charAt(0).toUpperCase();

  const avatarElement = (
    <Avatar className={cn("h-7 w-7 md:h-10 md:w-10", className)}>
      <AvatarImage src={src} className="object-cover" />
      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs uppercase">
        {initial || <User className="h-4 w-4 text-white" />}
      </AvatarFallback>
    </Avatar>
  );

  if (!showStatus && !status) {
    return avatarElement;
  }

  return (
    <div className="relative inline-flex flex-shrink-0 items-center justify-center">
      {avatarElement}
      {(status || showStatus) && (
        <StatusBadge
          status={status || "online"}
          size={statusSize}
          ringClass={ringClass}
        />
      )}
    </div>
  );
}
