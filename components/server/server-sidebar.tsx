import React from "react";
import { redirect } from "next/navigation";
import { ChannelType, MemberRole } from "@prisma/client";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { ServerHeader } from "@/components/server/server-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerSearch } from "@/components/server/server-search";
import { Separator } from "@/components/ui/separator";
import { ServerSection } from "@/components/server/server-section";
import { ServerChannel } from "@/components/server/server-channel";
import { ServerMember } from "@/components/server/server-member";
import { UserFooter } from "@/components/user-footer";

const iconMap = {
  [ChannelType.TEXT]: <Hash className="mr-2 h-4 w-4 text-indigo-500 dark:text-indigo-400" />,
  [ChannelType.AUDIO]: <Mic className="mr-2 h-4 w-4 text-emerald-500 dark:text-emerald-400" />,
  [ChannelType.VIDEO]: <Video className="mr-2 h-4 w-4 text-amber-500 dark:text-amber-400" />
};

const roleIconMap = {
  [MemberRole.GUEST]: null,
  [MemberRole.MODERATOR]: (
    <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />
  ),
  [MemberRole.ADMIN]: <ShieldAlert className="h-4 w-4 mr-2 text-rose-500" />
};

export async function ServerSidebar({ serverId }: { serverId: string }) {
  const profile = await currentProfile();

  if (!profile) return redirect("/");

  const server = await db.server.findUnique({
    where: {
      id: serverId
    },
    include: {
      channels: {
        orderBy: {
          createdAt: "asc"
        }
      },
      members: {
        include: {
          profile: true
        },
        orderBy: {
          role: "asc"
        }
      }
    }
  });

  const textChannels = server?.channels.filter(
    (channel) => channel.type === ChannelType.TEXT
  );
  const audioChannels = server?.channels.filter(
    (channel) => channel.type === ChannelType.AUDIO
  );
  const videoChannels = server?.channels.filter(
    (channel) => channel.type === ChannelType.VIDEO
  );

  const members = server?.members.filter(
    (member) => member.profileId !== profile.id
  );

  if (!server) return redirect("/");

  const role = server.members.find(
    (member) => member.profileId === profile.id
  )?.role;

  return (
    <div className="relative flex flex-col h-full text-primary w-full overflow-hidden bg-[#f2f3f5] dark:bg-[linear-gradient(180deg,#1c1d25_0%,#111217_100%)] border-r border-black/5 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/25">
      <div className="pointer-events-none absolute inset-0 dark:bg-[linear-gradient(135deg,rgba(99,102,241,0.18)_0%,transparent_42%,rgba(20,184,166,0.12)_100%)]" />
      <div className="relative z-10 flex flex-col h-full w-full">
        <ServerHeader server={server} role={role} />
        <ScrollArea className="flex-1 px-2.5">
          <div className="mt-2">
            <ServerSearch
              data={[
                {
                  label: "Text Channels",
                  type: "channel",
                  data: textChannels?.map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    icon: iconMap[channel.type]
                  }))
                },
                {
                  label: "Voice Channels",
                  type: "channel",
                  data: audioChannels?.map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    icon: iconMap[channel.type]
                  }))
                },
                {
                  label: "Video Channels",
                  type: "channel",
                  data: videoChannels?.map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    icon: iconMap[channel.type]
                  }))
                },
                {
                  label: "Members",
                  type: "member",
                  data: members?.map((member) => ({
                    id: member.id,
                    name: member.profile.name,
                    icon: roleIconMap[member.role]
                  }))
                }
              ]}
            />
          </div>
          <Separator className="bg-zinc-300/70 dark:bg-white/10 rounded-full my-2.5" />
          {!!textChannels?.length && (
            <div className="mb-2.5">
              <ServerSection
                sectionType="channels"
                channelType={ChannelType.TEXT}
                role={role}
                label="Text Channels"
              />
              <div className="space-y-0.5">
                {textChannels.map((channel) => (
                  <ServerChannel
                    key={channel.id}
                    channel={channel}
                    role={role}
                    server={server}
                  />
                ))}
              </div>
            </div>
          )}
          {!!audioChannels?.length && (
            <div className="mb-2.5">
              <ServerSection
                sectionType="channels"
                channelType={ChannelType.AUDIO}
                role={role}
                label="Voice Channels"
              />
              <div className="space-y-0.5">
                {audioChannels.map((channel) => (
                  <ServerChannel
                    key={channel.id}
                    channel={channel}
                    role={role}
                    server={server}
                  />
                ))}
              </div>
            </div>
          )}
          {!!videoChannels?.length && (
            <div className="mb-2.5">
              <ServerSection
                sectionType="channels"
                channelType={ChannelType.VIDEO}
                role={role}
                label="Video Channels"
              />
              <div className="space-y-0.5">
                {videoChannels.map((channel) => (
                  <ServerChannel
                    key={channel.id}
                    channel={channel}
                    role={role}
                    server={server}
                  />
                ))}
              </div>
            </div>
          )}
          {!!members?.length && (
            <div className="mb-2.5">
              <ServerSection
                sectionType="members"
                role={role}
                label="Members"
                server={server}
              />
              <div className="space-y-0.5">
                {members.map((member) => (
                  <ServerMember key={member.id} member={member} server={server} />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
        <UserFooter profile={profile} />
      </div>
    </div>
  );
}
