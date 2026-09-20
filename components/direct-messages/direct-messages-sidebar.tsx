import React from "react";
import { redirect } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DirectMessageItem } from "@/components/direct-messages/direct-message-item";

export async function DirectMessagesSidebar() {
  const profile = await currentProfile();

  if (!profile) return redirect("/");

  const members = await db.member.findMany({
    where: {
      profileId: {
        not: profile.id
      },
      server: {
        members: {
          some: {
            profileId: profile.id
          }
        }
      }
    },
    include: {
      profile: true,
      server: true
    },
    orderBy: {
      profile: {
        name: "asc"
      }
    }
  });

  const uniqueMembers = Array.from(
    new Map(members.map((member) => [member.profileId, member])).values()
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-black/5 bg-white/80 text-zinc-700 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111214] dark:text-zinc-300 dark:shadow-black/25">
      <div className="flex h-[53px] items-center border-b border-black/5 px-3 dark:border-white/10">
        <button className="flex h-8 w-full items-center gap-x-2 rounded-md border border-black/10 bg-zinc-100 px-3 text-left text-xs font-semibold text-zinc-500 transition hover:bg-zinc-200 dark:border-white/10 dark:bg-[#0b0c10] dark:text-zinc-400 dark:hover:bg-white/[0.05]">
          <Search className="h-3.5 w-3.5" />
          Find or start a conversation
        </button>
      </div>

      <div className="px-2 py-2">
        <button className="flex h-10 w-full items-center gap-x-3 rounded-md px-2 text-sm font-semibold transition hover:bg-zinc-200/70 dark:hover:bg-white/[0.06]">
          <Users className="h-5 w-5 text-zinc-500" />
          Friends
        </button>
      </div>

      <Separator className="mx-2 w-auto bg-zinc-200 dark:bg-white/[0.06]" />

      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          Direct Messages
        </p>
        <button className="rounded p-1 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-2 pb-3">
        <div className="space-y-0.5">
          {uniqueMembers.map((member) => (
            <DirectMessageItem key={member.id} member={member} />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
