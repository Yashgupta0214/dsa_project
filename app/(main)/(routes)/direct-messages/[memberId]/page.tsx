import React from "react";
import { redirect } from "next/navigation";
import { redirectToSignIn } from "@clerk/nextjs";

import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { MediaRoom } from "@/components/media-room";
import { getOrCreateConversationId } from "@/lib/conversation";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

interface DirectMessagePageProps {
  params: {
    memberId: string;
  };
  searchParams: {
    video?: boolean;
  };
}

export default async function DirectMessagePage({
  params: { memberId },
  searchParams: { video }
}: DirectMessagePageProps) {
  const [profile, otherMember] = await Promise.all([
    currentProfile(),
    db.member.findUnique({
      where: {
        id: memberId
      },
      select: {
        id: true,
        serverId: true,
        profile: {
          select: {
            name: true,
            imageUrl: true
          }
        }
      }
    })
  ]);

  if (!profile) return redirectToSignIn();
  if (!otherMember) return redirect("/direct-messages");

  const currentMember = await db.member.findFirst({
    where: {
      serverId: otherMember.serverId,
      profileId: profile.id
    },
    select: {
      id: true,
      role: true,
      profileId: true,
      serverId: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!currentMember) return redirect("/direct-messages");

  const conversation = await getOrCreateConversationId(
    currentMember.id,
    otherMember.id
  );

  if (!conversation) return redirect("/direct-messages");

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] dark:bg-[linear-gradient(180deg,#20222a_0%,#16171d_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.12)_0%,transparent_38%,rgba(20,184,166,0.08)_100%)] dark:bg-[linear-gradient(135deg,rgba(99,102,241,0.16)_0%,transparent_40%,rgba(20,184,166,0.1)_100%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <ChatHeader
          imageUrl={otherMember.profile.imageUrl}
          name={otherMember.profile.name}
          serverId={otherMember.serverId}
          type="conversation"
          chatId={conversation.id}
        />
        {video && <MediaRoom chatId={conversation.id} video audio />}
        {!video && (
          <>
            <ChatMessages
              member={currentMember}
              name={otherMember.profile.name}
              chatId={conversation.id}
              type="conversation"
              apiUrl="/api/direct-messages"
              paramKey="conversationId"
              paramValue={conversation.id}
              socketUrl="/api/socket/direct-messages"
              socketQuery={{
                conversationId: conversation.id
              }}
            />
            <ChatInput
              name={otherMember.profile.name}
              type="conversation"
              apiUrl="/api/socket/direct-messages"
              query={{
                conversationId: conversation.id
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
