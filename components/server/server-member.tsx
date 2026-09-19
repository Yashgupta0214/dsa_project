"use client";

import { Member, MemberRole, Profile, Server } from "@prisma/client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

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

  const icon = roleIconMap[member.role];
  const isActive = params?.memberId === member.id;

  const onClick = () =>
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group px-2.5 py-1.5 rounded-lg flex items-center gap-x-2.5 w-full transition-all duration-150 focus:outline-none",
        !isActive &&
          "hover:bg-zinc-200/60 dark:hover:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200",
        isActive &&
          "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm"
      )}
    >
      <UserAvatar
        src={member.profile.imageUrl}
        className="h-7 w-7 md:h-7 md:w-7 ring-1 ring-black/5 dark:ring-white/10"
      />
      <p
        className={cn(
          "line-clamp-1 text-sm tracking-tight transition-colors",
          !isActive && "group-hover:text-zinc-700 dark:group-hover:text-zinc-200",
          isActive && "text-indigo-600 dark:text-indigo-300 font-medium"
        )}
      >
        {member.profile.name}
      </p>
      {icon}
    </button>
  );
};
