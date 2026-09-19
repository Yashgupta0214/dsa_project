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
    <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#111214] bg-[#e3e5e8] py-3 border-r border-black/5 dark:border-white/5 shadow-inner">
      <NavigationAction />
      <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-800 rounded-full w-8 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {servers.map((server) => (
          <div key={server.id} className="mb-3">
            <NavigationItem
              id={server.id}
              imageUrl={server.imageUrl}
              name={server.name}
            />
          </div>
        ))}
      </ScrollArea>
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4 pt-2 border-t border-black/5 dark:border-white/5 w-full">
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
