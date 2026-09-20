"use client";

import { Member, MemberRole, Profile, Server } from "@prisma/client";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { getMemberColor } from "@/lib/member-colors";

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
  const memberColor = getMemberColor(member.id);

  const onClick = () =>
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative px-2.5 py-1.5 rounded-md flex items-center gap-x-2 w-full transition-all duration-150 focus:outline-none",
        !isActive &&
          "hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100",
        isActive &&
          "bg-zinc-200/80 dark:bg-indigo-500/20 text-zinc-900 dark:text-indigo-300 font-semibold shadow-sm"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
      )}
      <UserAvatar
        src={member.profile.imageUrl}
        className="h-6 w-6 md:h-6 md:w-6 ring-1 ring-black/10 dark:ring-white/10"
      />
      <p
        className={cn(
          "line-clamp-1 text-[13px] tracking-tight transition-colors",
          !isActive &&
            "group-hover:text-zinc-900 text-zinc-600 dark:group-hover:text-zinc-100 dark:text-zinc-300",
          isActive && "text-indigo-700 dark:text-indigo-300 font-medium"
        )}
        style={{ color: memberColor }}
      >
        {member.profile.name}
      </p>
      {icon}
    </button>
  );
};
