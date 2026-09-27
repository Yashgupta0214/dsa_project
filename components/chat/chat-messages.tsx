"use client";

import React, { Fragment, useRef, ElementRef, useEffect } from "react";
import { Member, Message, Profile } from "@prisma/client";
import { ServerCrash } from "lucide-react";
import { GradientLoader } from "@/components/ui/loader";
import { format } from "date-fns";
import axios from "axios";

import { ChatWelcome } from "@/components/chat/chat-welcome";
import { ChatItem } from "@/components/chat/chat-item";
import { useChatQuery } from "@/hooks/use-chat-query";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatScroll } from "@/hooks/use-chat-scroll";

interface ChatMessagesProps {
  name: string;
  member: Member;
  chatId: string;
  apiUrl: string;
  socketUrl: string;
  socketQuery: Record<string, string>;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
  type: "channel" | "conversation";
}

type MessagesWithMemberWithProfile = Message & {
  member: Member & {
    profile: Profile;
  };
};

const DATE_FORMAT = "d MMM yyyy, HH:mm";

export function ChatMessages({
  name,
  member,
  chatId,
  apiUrl,
  socketUrl,
  socketQuery,
  paramKey,
  paramValue,
  type
}: ChatMessagesProps) {
  const queryKey = `chat:${chatId}`;
  const addKey = `chat:${chatId}:messages`;
  const updateKey = `chat:${chatId}:messages:update`;

  const chatRef = useRef<ElementRef<"div">>(null);
  const bottomRef = useRef<ElementRef<"div">>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useChatQuery({
      queryKey,
      apiUrl,
      paramKey,
      paramValue
    });
  useChatSocket({
    queryKey,
    addKey,
    updateKey
  });
  useChatScroll({
    chatRef,
    bottomRef,
    loadMore: fetchNextPage,
    shouldLoadMore: !isFetchingNextPage && !!hasNextPage,
    count: data?.pages?.[0]?.items?.length ?? 0
  });

  // Automatically mark unread direct messages as seen when the conversation is active
  useEffect(() => {
    if (type !== "conversation" || !chatId) return;

    const hasUnread = data?.pages?.some((page: any) =>
      page?.items?.some(
        (m: any) =>
          (m.memberId ? m.memberId !== member.id : m.member?.id !== member.id) &&
          !m.seen
      )
    );

    if (hasUnread) {
      axios
        .post("/api/socket/direct-messages/seen", {
          conversationId: chatId
        })
        .catch(() => {
          axios
            .post("/api/direct-messages/seen", {
              conversationId: chatId
            })
            .catch((err) => console.error("[SEEN_TRIGGER_ERROR]", err));
        });
    }
  }, [type, chatId, data, member.id]);

  if (status === "loading")
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <GradientLoader className="h-8 w-8 my-4" />
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Loading messages...
        </p>
      </div>
    );

  if (status === "error")
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <ServerCrash className="h-7 w-7 text-zinc-500 my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Something went wrong!
        </p>
      </div>
    );

  return (
    <div
      className="flex-1 flex flex-col overflow-y-auto px-3 pb-2"
      ref={chatRef}
    >
      {!hasNextPage && <div className="flex-1" />}
      {!hasNextPage && <ChatWelcome name={name} type={type} />}
      {hasNextPage && (
        <div className="flex justify-center">
          {isFetchingNextPage ? (
            <GradientLoader className="h-6 w-6 my-4" />
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 text-xs my-4 dark:hover:text-zinc-300 transition"
            >
              Load previous messages
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col-reverse mt-auto rounded-xl border border-white/60 bg-white/35 shadow-sm shadow-black/5 backdrop-blur-sm dark:border-white/10 dark:bg-black/10">
        {data?.pages.map((group, index) => (
          <Fragment key={index}>
            {group?.items.map((message: MessagesWithMemberWithProfile) => (
              <ChatItem
                key={message.id}
                currentMember={member}
                member={message.member}
                id={message.id}
                content={message.content}
                fileUrl={message.fileUrl}
                deleted={message.deleted}
                timestamp={format(
                  new Date(message.createdAt),
                  DATE_FORMAT
                )}
                isUpdated={message.updatedAt !== message.createdAt}
                socketQuery={socketQuery}
                socketUrl={socketUrl}
                pinned={(message as any).pinned}
                pinnedAt={(message as any).pinnedAt}
                pinExpiresAt={(message as any).pinExpiresAt}
                seen={(message as any).seen}
                seenAt={(message as any).seenAt}
                isDirectMessage={type === "conversation" || socketUrl.includes("direct-messages")}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
