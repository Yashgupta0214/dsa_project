import React from "react";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { NavigationAction } from "@/components/navigation/navigation-action";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { ModeToggle } from "@/components/mode-toggle";

export async function NavigationSidebar() {
  const profile = await currentProfile();

  if (!profile) return redirect("/");

  const servers = await db.server.findMany({
    where: {
      members: {
        some: {
          profileId: profile.id
        }
      }
    }
  });

  return (
    <div className="space-y-3 flex flex-col h-full items-center text-primary w-full bg-[#e3e5e8] dark:bg-[linear-gradient(180deg,#11131a_0%,#0b0c11_100%)] py-2.5 border-r border-black/5 dark:border-white/10 shadow-inner">
      <NavigationAction />
      <Separator className="h-px bg-zinc-300 dark:bg-white/10 rounded-full w-8 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {servers.map((server) => (
          <div key={server.id} className="mb-2">
            <NavigationItem
              id={server.id}
              imageUrl={server.imageUrl}
              name={server.name}
            />
          </div>
        ))}
      </ScrollArea>
      <div className="pb-2 mt-auto flex items-center flex-col gap-y-3 pt-2 border-t border-black/5 dark:border-white/5 w-full">
        <ModeToggle />
        <div className="p-1 rounded-full hover:ring-2 hover:ring-indigo-500/30 transition">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-[44px] w-[44px] rounded-full shadow-md"
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
