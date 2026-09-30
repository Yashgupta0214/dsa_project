"use client";

import { Member, Profile, Server } from "@prisma/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { getMemberColor } from "@/lib/member-colors";
import { usePresence } from "@/components/providers/presence-provider";
import { useUnreadStore } from "@/hooks/use-unread-store";
import React from "react";

interface DirectMessageItemProps {
  member: Pick<
    Member,
    "id" | "profileId" | "serverId" | "role" | "createdAt" | "updatedAt"
  > & {
    profile: Pick<Profile, "name" | "imageUrl">;
    server: Pick<Server, "name">;
  };
}

export function DirectMessageItem({ member }: DirectMessageItemProps) {
  const params = useParams();
  const router = useRouter();
  const { getUserStatus } = usePresence();

  const rawUnread = useUnreadStore(
    (state) =>
      state.unreadByMember[member.id] ||
      state.unreadByMember[member.profileId] ||
      0
  );
  const clearMemberUnread = useUnreadStore((state) => state.clearMemberUnread);

  const isActive = params?.memberId === member.id;
  const unreadCount = !isActive ? rawUnread : 0;
  const memberColor = getMemberColor(member.id);
  const status = getUserStatus(member.profileId);
  const href = `/direct-messages/${member.id}`;

  React.useEffect(() => {
    if (isActive && rawUnread > 0) {
      clearMemberUnread(member.id);
      clearMemberUnread(member.profileId);
    }
  }, [isActive, rawUnread, member, clearMemberUnread]);

  const handleClick = () => {
    clearMemberUnread(member.id);
    clearMemberUnread(member.profileId);
  };

  return (
    <Link
      href={href}
      prefetch
      onClick={handleClick}
      onMouseEnter={() => router.prefetch(href)}
      className={cn(
        "group relative flex h-11 w-full cursor-pointer items-center gap-x-2 rounded-md px-2 text-left transition",
        "hover:bg-zinc-200/70 dark:hover:bg-white/[0.06]",
        isActive && "bg-zinc-200 dark:bg-white/[0.09]"
      )}
    >
      {!isActive && unreadCount > 0 && (
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-2 rounded-r-full bg-zinc-800 dark:bg-white" />
      )}
      <UserAvatar
        src={member.profile.imageUrl}
        name={member.profile.name}
        status={status}
        statusSize="sm"
        ringClass="ring-white dark:ring-[#111214]"
        className="h-8 w-8 shrink-0 ring-1 ring-black/5 dark:ring-white/10"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] leading-4",
            unreadCount > 0 ? "font-bold text-zinc-900 dark:text-white" : "font-semibold"
          )}
          style={{ color: memberColor }}
        >
          {member.profile.name}
        </p>
        <p className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
          {member.server.name}
        </p>
      </div>

      {/* Unread Message Count Badge */}
      {unreadCount > 0 && !isActive && (
        <span className="ml-auto flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm shadow-rose-500/30 shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
