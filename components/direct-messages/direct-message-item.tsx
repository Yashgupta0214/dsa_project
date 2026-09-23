"use client";

import { Member, Profile, Server } from "@prisma/client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { getMemberColor } from "@/lib/member-colors";

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

  const isActive = params?.memberId === member.id;
  const memberColor = getMemberColor(member.id);
  const href = `/direct-messages/${member.id}`;

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => router.prefetch(href)}
      className={cn(
        "group flex h-11 w-full cursor-pointer items-center gap-x-2 rounded-md px-2 text-left transition",
        "hover:bg-zinc-200/70 dark:hover:bg-white/[0.06]",
        isActive && "bg-zinc-200 dark:bg-white/[0.09]"
      )}
    >
      <UserAvatar
        src={member.profile.imageUrl}
        className="h-8 w-8 shrink-0 ring-1 ring-black/5 dark:ring-white/10"
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px] font-semibold leading-4"
          style={{ color: memberColor }}
        >
          {member.profile.name}
        </p>
        <p className="truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
          {member.server.name}
        </p>
      </div>
    </Link>
  );
}
