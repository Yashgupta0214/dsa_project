"use client";

import { Member, MemberRole, Profile, Server } from "@prisma/client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { getMemberColor } from "@/lib/member-colors";
import { usePresence } from "@/components/providers/presence-provider";
import { useUnreadStore } from "@/hooks/use-unread-store";
import React from "react";

interface ServerMemberProps {
  member: Member & { profile: Profile };
  server: Server;
}

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 ml-auto text-indigo-500" />
  ),
  [MemberRole.ADMIN]: (
    <ShieldAlert className="h-4 w-4 ml-auto text-rose-500" />
  )
};

export const ServerMember = ({ member, server }: ServerMemberProps) => {
  const params = useParams();
  const router = useRouter();
  const { getUserStatus } = usePresence();

  const rawUnread = useUnreadStore(
    (state) =>
      state.unreadByMember[member.id] ||
      state.unreadByMember[member.profileId] ||
      state.unreadByMember[member.profile.userId] ||
      0
  );
  const clearMemberUnread = useUnreadStore((state) => state.clearMemberUnread);

  const icon = roleIconMap[member.role];
  const isActive = params?.memberId === member.id;
  const unreadCount = !isActive ? rawUnread : 0;
  const memberColor = getMemberColor(member.id);
  const status = getUserStatus(member.profileId);

  React.useEffect(() => {
    if (isActive && rawUnread > 0) {
      clearMemberUnread(member.id);
      clearMemberUnread(member.profileId);
      clearMemberUnread(member.profile.userId);
    }
  }, [isActive, rawUnread, member, clearMemberUnread]);

  const onClick = () => {
    clearMemberUnread(member.id);
    clearMemberUnread(member.profileId);
    clearMemberUnread(member.profile.userId);
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative px-2.5 py-1.5 rounded-md flex items-center gap-x-2 w-full transition-all duration-150 focus:outline-none",
        !isActive &&
          "hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
        !isActive && unreadCount > 0 &&
          "text-zinc-900 dark:text-zinc-100 font-bold",
        isActive &&
          "bg-zinc-200/80 dark:bg-indigo-500/20 text-zinc-900 dark:text-indigo-300 font-semibold shadow-sm"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      )}
      {!isActive && unreadCount > 0 && (
        <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-2 rounded-r-full bg-zinc-800 dark:bg-white" />
      )}
      <UserAvatar
        src={member.profile.imageUrl}
        name={member.profile.name}
        status={status}
        statusSize="xs"
        ringClass="ring-[#f2f3f5] dark:ring-[#1a1b22]"
        className="h-6 w-6 md:h-6 md:w-6 ring-1 ring-black/10 dark:ring-white/10"
      />
      <p
        className={cn(
          "line-clamp-1 text-[13px] tracking-tight transition-colors",
          !isActive &&
            "group-hover:text-zinc-900 text-zinc-600 dark:group-hover:text-zinc-100 dark:text-zinc-300",
          !isActive && unreadCount > 0 && "font-bold text-zinc-900 dark:text-white",
          isActive && "text-indigo-700 dark:text-indigo-300 font-medium"
        )}
        style={{ color: memberColor }}
      >
        {member.profile.name}
      </p>

      {/* Unread Message Count Badge */}
      {unreadCount > 0 && !isActive && (
        <span className="ml-auto flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm shadow-rose-500/30 shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {unreadCount === 0 && icon}
    </button>
  );
};
