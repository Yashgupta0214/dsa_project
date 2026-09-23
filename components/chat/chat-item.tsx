"use client";

import React, { useEffect, useState } from "react";
import { Member, MemberRole, Profile } from "@prisma/client";
import {
  Edit,
  FileIcon,
  ShieldAlert,
  ShieldCheck,
  Trash,
  Copy,
  Check,
  Reply
} from "lucide-react";
import Image from "next/image";
import * as z from "zod";
import axios from "axios";
import qs from "query-string";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useParams } from "next/navigation";

import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { getMemberColor } from "@/lib/member-colors";

interface ChatItemProps {
  id: string;
  content: string;
  member: Member & { profile: Profile };
  timestamp: string;
  fileUrl: string | null;
  deleted: boolean;
  currentMember: Member;
  isUpdated: boolean;
  socketUrl: string;
  socketQuery: Record<string, string>;
}

const roleIconMap = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-3.5 w-3.5 ml-1.5 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-3.5 w-3.5 ml-1.5 text-rose-500" />
};

const formSchema = z.object({
  content: z.string().min(1)
});

export function ChatItem({
  id,
  content,
  member,
  timestamp,
  fileUrl,
  deleted,
  currentMember,
  isUpdated,
  socketUrl,
  socketQuery
}: ChatItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { onOpen } = useModal();

  const params = useParams();
  const router = useRouter();

  const onMemberClick = () => {
    if (member.id === currentMember.id) return;
    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
  };

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === "Escape" || event.keyCode === 27) {
        setIsEditing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${id}`,
        query: socketQuery
      });

      await axios.patch(url, values);

      form.reset();
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    form.reset({ content });
  }, [content, form]);

  const fileType = fileUrl?.split(".").pop();

  const isAdmin = currentMember.role === MemberRole.ADMIN;
  const isModerator = currentMember.role === MemberRole.MODERATOR;
  const isOwner = currentMember.id === member.id;
  const canDeleteMessage = !deleted && (isAdmin || isModerator || isOwner);
  const canEditMessage = !deleted && isOwner && !fileUrl;
  const isPDF = fileType === "pdf" && fileUrl;
  const isImage = !isPDF && fileUrl;
  const memberColor = getMemberColor(member.id);

  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>({});

  const onCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onQuoteReply = () => {
    window.dispatchEvent(
      new CustomEvent("chat_reply_quote", {
        detail: {
          author: member.profile.name,
          content: content
        }
      })
    );
  };

  const toggleReaction = (emoji: string) => {
    setReactions((prev) => {
      const current = prev[emoji] || 0;
      const isReacted = userReactions[emoji];
      const updated = isReacted ? Math.max(0, current - 1) : current + 1;
      const nextReactions = { ...prev };
      if (updated > 0) nextReactions[emoji] = updated;
      else delete nextReactions[emoji];
      return nextReactions;
    });

    setUserReactions((prev) => ({
      ...prev,
      [emoji]: !prev[emoji]
    }));
  };

  return (
    <div className="relative group w-full px-3">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-indigo-300/70 dark:bg-indigo-300/25" />
      <div className="relative ml-3 flex gap-x-2.5 items-start w-full border-t border-zinc-300/60 py-2 transition-colors duration-150 hover:bg-white/45 dark:border-white/10 dark:hover:bg-white/[0.04]">
        <div
          onClick={onMemberClick}
          className="cursor-pointer hover:drop-shadow-md transition pt-0.5 flex-shrink-0"
        >
          <UserAvatar
            src={member.profile.imageUrl}
            className="h-7 w-7 md:h-7 md:w-7 ring-1 ring-black/5 dark:ring-white/10"
          />
        </div>
        <div className="flex flex-col w-full min-w-0">
          <div className="flex items-center gap-x-2 leading-none">
            <div className="flex items-center">
              <p
                onClick={onMemberClick}
                className="font-bold text-[13px] hover:underline cursor-pointer tracking-tight"
                style={{ color: memberColor }}
              >
                {member.profile.name}
              </p>
              <ActionTooltip label={member.role}>
                {roleIconMap[member.role]}
              </ActionTooltip>
            </div>
          </div>
          {isImage && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-xl mt-1.5 overflow-hidden border border-black/5 dark:border-white/10 flex items-center bg-secondary h-44 w-44 shadow-md hover:scale-[1.01] transition-transform duration-200"
            >
              <Image
                src={fileUrl}
                alt={content}
                fill
                className="object-cover"
              />
            </a>
          )}
          {isPDF && (
            <div className="relative flex items-center p-2 mt-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 w-fit">
              <FileIcon className="h-8 w-8 fill-indigo-200 stroke-indigo-500" />
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:underline"
              >
                PDF Document
              </a>
            </div>
          )}
          {!fileUrl && !isEditing && (
            <p
              className={cn(
                "text-sm text-zinc-700 dark:text-zinc-200 font-normal leading-snug mt-0.5",
                deleted &&
                  "italic text-zinc-400 dark:text-zinc-500 text-xs mt-0.5"
              )}
            >
              {content}
              {isUpdated && !deleted && (
                <span className="text-[10px] mx-1.5 text-zinc-400 dark:text-zinc-500 font-medium">
                  (edited)
                </span>
              )}
            </p>
          )}
          {!fileUrl && isEditing && (
            <Form {...form}>
              <form
                className="flex items-center w-full gap-x-2 pt-2"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            disabled={isLoading}
                            placeholder="Edited message"
                            className="p-2.5 bg-zinc-200/90 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-xl text-zinc-800 dark:text-zinc-200 text-sm"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  disabled={isLoading}
                  size="sm"
                  variant="primary"
                  className="rounded-xl px-4 font-semibold shadow-md shadow-indigo-500/20"
                >
                  Save
                </Button>
              </form>
              <span className="text-[10px] mt-1 text-zinc-400">
                Press escape to cancel, enter to save
              </span>
            </Form>
          )}

          {/* Reaction Badges */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {Object.entries(reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className={cn(
                    "flex items-center gap-x-1 px-2 py-0.5 rounded-lg border text-xs transition",
                    userReactions[emoji]
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-semibold"
                      : "border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-black/10 dark:hover:bg-white/10"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] font-bold">{count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-1 flex items-center gap-x-2">
            <div className="h-px flex-1 bg-zinc-300/70 dark:bg-white/10" />
            <span className="shrink-0 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
              {timestamp}
            </span>
          </div>
        </div>
      </div>

      {/* Hover Actions Menu */}
      <div className="hidden group-hover:flex items-center gap-x-0.5 absolute p-1 top-0 right-7 bg-white/90 dark:bg-[#18191c]/90 border border-black/10 dark:border-white/10 rounded-xl shadow-xl backdrop-blur-md z-10 transition">
        {/* Quick Reactions */}
        {["❤️", "👍", "🔥", "😂"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className="p-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition"
          >
            {emoji}
          </button>
        ))}

        <div className="w-px h-3 bg-black/10 dark:bg-white/10 mx-0.5" />

        {/* Copy Text Action */}
        {!fileUrl && content && (
          <ActionTooltip label={copied ? "Copied!" : "Copy Text"}>
            <button
              onClick={onCopy}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
              )}
            </button>
          </ActionTooltip>
        )}

        {/* Quote Reply Action */}
        {!deleted && (
          <ActionTooltip label="Quote Reply">
            <button
              onClick={onQuoteReply}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <Reply className="w-3.5 h-3.5 text-zinc-400 hover:text-indigo-500" />
            </button>
          </ActionTooltip>
        )}

        {canEditMessage && (
          <ActionTooltip label="Edit">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <Edit className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
            </button>
          </ActionTooltip>
        )}
        {canDeleteMessage && (
          <ActionTooltip label="Delete">
            <button
              onClick={() =>
                onOpen("deleteMessage", {
                  apiUrl: `${socketUrl}/${id}`,
                  query: socketQuery
                })
              }
              className="p-1 rounded-lg hover:bg-rose-500/10 transition"
            >
              <Trash className="w-3.5 h-3.5 text-zinc-400 hover:text-rose-500" />
            </button>
          </ActionTooltip>
        )}
      </div>
    </div>
  );
}
