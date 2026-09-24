"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Reply, SendHorizonal, ShieldAlert, ShieldCheck, X } from "lucide-react";
import axios from "axios";
import qs from "query-string";
import { useRouter } from "next/navigation";
import { Member, MemberRole, Profile } from "@prisma/client";
import { Lock, Timer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerTemporary } from "@/hooks/use-server-temporary";

import {
  FormControl,
  Form,
  FormField,
  FormItem
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { EmojiPicker } from "@/components/emoji-picker";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
  serverId?: string;
}

type MemberWithProfile = Member & { profile: Profile };

const roleIconMap: Record<MemberRole, React.ReactNode> = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
};

const formSchema = z.object({
  content: z.string().min(1)
});

export function ChatInput({ apiUrl, query, name, type, serverId }: ChatInputProps) {
  const { onOpen } = useModal();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" }
  });

  // --- Reply state ---
  const [replyingTo, setReplyingTo] = useState<{
    id?: string;
    author: string;
    avatar?: string;
    content: string;
  } | null>(null);

  // --- @Mention state ---
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Fetch members when serverId is available (lazy load on first @ trigger)
  const fetchMembers = useCallback(async () => {
    if (!serverId || membersLoaded) return;
    try {
      const res = await axios.get(`/api/members?serverId=${serverId}`);
      setMembers(res.data);
      setMembersLoaded(true);
    } catch (error) {
      console.error("Failed to fetch members:", error);
    }
  }, [serverId, membersLoaded]);

  // Filter members based on mention query
  const filteredMembers = members.filter((m) =>
    m.profile.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [mentionQuery]);

  // Handle reply events (from ChatItem)
  React.useEffect(() => {
    const handleReply = (e: any) => {
      if (e?.detail?.author) {
        setReplyingTo({
          id: e.detail.id,
          author: e.detail.author,
          avatar: e.detail.avatar,
          content: e.detail.content || ""
        });
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    };

    window.addEventListener("chat_reply", handleReply);
    window.addEventListener("chat_reply_quote", handleReply);
    return () => {
      window.removeEventListener("chat_reply", handleReply);
      window.removeEventListener("chat_reply_quote", handleReply);
    };
  }, []);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const trimmedContent = values.content.trim();
    if (!trimmedContent) return;

    try {
      const url = qs.stringifyUrl({
        url: apiUrl,
        query
      });

      let contentToSend = trimmedContent;
      if (replyingTo) {
        const replyPayload = {
          id: replyingTo.id,
          name: replyingTo.author,
          avatar: replyingTo.avatar,
          content: replyingTo.content.slice(0, 150)
        };
        contentToSend = `[reply:${JSON.stringify(replyPayload)}]${trimmedContent}`;
      }

      // ⚡ Instant UI Reset (0ms latency feedback for send button & input box)
      form.setValue("content", "");
      form.reset({ content: "" });
      setReplyingTo(null);

      // Re-focus input immediately so consecutive messages are effortless
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      // Asynchronous non-blocking message submission
      axios.post(url, { content: contentToSend }).catch((error) => {
        console.error("Failed to send message:", error);
      });
    } catch (error) {
      console.error(error);
    }
  };

  // Detect @ trigger in input
  const handleInputChange = (
    value: string,
    fieldOnChange: (val: string) => void
  ) => {
    fieldOnChange(value);

    if (!serverId) return;

    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Find the last @ that isn't preceded by a word character
    const atMatch = textBeforeCursor.match(/(^|[^a-zA-Z0-9])@([a-zA-Z0-9 ]*)$/);

    if (atMatch) {
      if (!membersLoaded) {
        fetchMembers();
      }
      const query = atMatch[2] || "";
      const atIndex = textBeforeCursor.lastIndexOf("@");
      setMentionQuery(query);
      setMentionStartIndex(atIndex);
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    }
  };

  // Insert mention into the input
  const insertMention = (member: MemberWithProfile) => {
    const currentValue = form.getValues("content");
    const before = currentValue.slice(0, mentionStartIndex);
    const input = inputRef.current;
    const cursorPos = input?.selectionStart || currentValue.length;
    const after = currentValue.slice(cursorPos);

    const newValue = `${before}@${member.profile.name} ${after}`;
    form.setValue("content", newValue);
    setShowMentionPopup(false);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Focus back on input
    setTimeout(() => {
      if (input) {
        input.focus();
        const newCursorPos = before.length + member.profile.name.length + 2; // +2 for @ and space
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in the mention popup and reply cancellation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (showMentionPopup) {
        setShowMentionPopup(false);
      } else if (replyingTo) {
        setReplyingTo(null);
      }
      return;
    }

    if (!showMentionPopup || filteredMembers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < filteredMembers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredMembers.length - 1
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (showMentionPopup && filteredMembers.length > 0) {
        e.preventDefault();
        insertMention(filteredMembers[selectedMentionIndex]);
      }
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setShowMentionPopup(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const channelId = query?.channelId;
  const { isExpired, timeUntilDeletion, extendLifespan, expiryAction } = useServerTemporary(
    serverId,
    channelId
  );

  if (isExpired) {
    const mins = Math.floor(timeUntilDeletion / 60);
    const secs = timeUntilDeletion % 60;
    const timeFormatted = `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;

    return (
      <div className="px-3 pb-3 pt-1">
        <div className="p-4 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500 shrink-0">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5 justify-center sm:justify-start">
                <span>🔒 Server Expired — All messaging & features disabled</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {expiryAction === "delete"
                  ? `Auto-deleting server in ${timeFormatted}. Only extending server lifespan will restore full chat access.`
                  : "Server is locked in Read-Only mode. Messaging is disabled."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => extendLifespan(1)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shrink-0 shadow-md shadow-amber-500/20 h-9 px-4 rounded-xl"
          >
            <Timer className="w-4 h-4 mr-1.5" />
            Extend Lifespan (+1 Day)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-3 pb-3 pt-1">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex flex-col w-full shadow-lg shadow-black/10">
                  {/* Discord-style Replying To Bar */}
                  {replyingTo && (
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#2b2d31]/95 border border-b-0 border-white/10 rounded-t-2xl text-xs text-zinc-300 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-1 duration-150">
                      <div className="flex items-center gap-x-2 truncate min-w-0 mr-2">
                        <Reply className="h-3.5 w-3.5 text-zinc-400 rotate-180 shrink-0" />
                        <span className="shrink-0 text-zinc-400 text-xs">Replying to</span>
                        <span className="font-semibold text-indigo-400 shrink-0 text-xs">
                          @{replyingTo.author}
                        </span>
                        {replyingTo.content && (
                          <span className="text-zinc-500 truncate text-xs italic max-w-[200px] md:max-w-[400px]">
                            &quot;{replyingTo.content}&quot;
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 hover:bg-white/10 rounded-full transition text-zinc-400 hover:text-zinc-200 shrink-0"
                        title="Cancel reply (Escape)"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div
                    className={cn(
                      "relative flex items-center bg-[#232428] border border-black/10 dark:border-white/10 transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-400/60 backdrop-blur-xl overflow-visible",
                      replyingTo ? "rounded-b-2xl rounded-t-none border-t-0" : "rounded-2xl"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onOpen("messageFile", { apiUrl, query })
                      }
                      className="ml-2.5 h-8 w-8 rounded-xl bg-zinc-700/60 text-zinc-300 hover:bg-indigo-500 hover:text-white transition-colors flex items-center justify-center focus:outline-none flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <Input
                      placeholder={`Message ${
                        type === "conversation" ? "@" + name : "#" + name
                      }...`}
                      autoComplete="off"
                      className="h-12 px-3 bg-transparent border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-100 placeholder:text-zinc-400 text-sm font-normal"
                      {...field}
                      ref={(el) => {
                        inputRef.current = el;
                        // Forward ref for react-hook-form
                        if (typeof field.ref === "function") {
                          field.ref(el);
                        }
                      }}
                      onChange={(e) =>
                        handleInputChange(e.target.value, field.onChange)
                      }
                      onKeyDown={handleKeyDown}
                    />
                    <div className="mr-1.5 flex-shrink-0">
                      <EmojiPicker
                        onChange={(emoji: string) =>
                          field.onChange(`${field.value ? field.value + " " : ""}${emoji}`)
                        }
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !field.value || !field.value.trim()}
                      className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-zinc-700/50 disabled:text-zinc-500 disabled:shadow-none"
                    >
                      <SendHorizonal className="h-3.5 w-3.5" />
                    </button>

                    {/* @Mention Autocomplete Popup */}
                    {showMentionPopup && serverId && filteredMembers.length > 0 && (
                      <div
                        ref={popupRef}
                      className="absolute bottom-full left-0 right-0 mb-2 mx-2 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-[#1e1f22]/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-50 animate-in slide-in-from-bottom-2 fade-in duration-150"
                    >
                      <div className="px-3 py-2 border-b border-white/5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Members — type to filter
                        </p>
                      </div>
                      <div className="py-1">
                        {filteredMembers.map((member, index) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => insertMention(member)}
                            onMouseEnter={() => setSelectedMentionIndex(index)}
                            className={cn(
                              "flex w-full items-center gap-x-2.5 px-3 py-2 text-left transition-colors duration-75",
                              index === selectedMentionIndex
                                ? "bg-indigo-500/20 text-white"
                                : "text-zinc-300 hover:bg-white/5"
                            )}
                          >
                            <UserAvatar
                              src={member.profile.imageUrl}
                              className="h-7 w-7 md:h-7 md:w-7 ring-1 ring-white/10 flex-shrink-0"
                            />
                            <div className="flex items-center gap-x-1.5 min-w-0">
                              <span className="text-sm font-medium truncate">
                                {member.profile.name}
                              </span>
                              {roleIconMap[member.role]}
                            </div>
                            <span className="ml-auto text-[11px] text-zinc-500 font-medium capitalize">
                              {member.role.toLowerCase()}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
