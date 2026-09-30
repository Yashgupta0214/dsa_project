"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  Search,
  X,
  Hash,
  AtSign,
  FileIcon,
  ImageIcon,
  ArrowRight,
  ExternalLink,
  Clock,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { GradientLoader } from "@/components/ui/loader";
import { parseMessageContent } from "@/components/chat/chat-item";
import { cn } from "@/lib/utils";

interface ChatSearchProps {
  chatId: string;
  name: string;
  type: "channel" | "conversation";
}

const roleIconMap = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-3.5 w-3.5 ml-1 text-indigo-500 shrink-0" />,
  ADMIN: <ShieldAlert className="h-3.5 w-3.5 ml-1 text-rose-500 shrink-0" />
};

export function ChatSearch({ chatId, name, type }: ChatSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+F or Cmd+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !chatId) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        setHasSearched(true);

        const endpoint =
          type === "channel"
            ? `/api/messages/search?channelId=${encodeURIComponent(
                chatId
              )}&query=${encodeURIComponent(query.trim())}`
            : `/api/direct-messages/search?conversationId=${encodeURIComponent(
                chatId
              )}&query=${encodeURIComponent(query.trim())}`;

        const res = await axios.get(endpoint);
        setResults(res.data || []);
      } catch (error) {
        console.error("Failed to search messages:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, chatId, type]);

  const jumpToMessage = useCallback((messageId: string) => {
    setIsOpen(false);
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add(
          "ring-2",
          "ring-indigo-500",
          "bg-indigo-500/20",
          "transition-all",
          "duration-500",
          "shadow-lg",
          "shadow-indigo-500/10"
        );
        setTimeout(() => {
          element.classList.remove(
            "ring-2",
            "ring-indigo-500",
            "bg-indigo-500/20",
            "shadow-lg",
            "shadow-indigo-500/10"
          );
        }, 2500);
      }
    }, 150);
  }, []);

  // Highlight query occurrences in text
  const renderHighlightedText = (rawContent: string, highlight: string) => {
    const { mainContent } = parseMessageContent(rawContent);
    if (!highlight.trim() || !mainContent) {
      return mainContent;
    }

    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = mainContent.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-amber-400/30 text-amber-300 dark:text-amber-200 font-semibold px-0.5 rounded"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <ActionTooltip side="bottom" label="Search Messages (Ctrl+F)">
        <DialogTrigger asChild>
          <button
            type="button"
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 flex items-center justify-center focus:outline-none"
            aria-label="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>
        </DialogTrigger>
      </ActionTooltip>

      <DialogContent className="bg-white dark:bg-[#18191e] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-xl w-full">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-black/5 dark:border-white/5 bg-zinc-50/90 dark:bg-[#121316]/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500 text-white shadow-sm shadow-indigo-500/25">
                {type === "channel" ? (
                  <Hash className="w-3.5 h-3.5" />
                ) : (
                  <AtSign className="w-3.5 h-3.5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Search in {type === "channel" ? `#${name}` : `@${name}`}
                </DialogTitle>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Find messages, links, and keywords in this conversation
                </p>
              </div>
            </div>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-black/10 dark:border-white/10 bg-zinc-100 dark:bg-white/10 px-1.5 font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              <span>ESC to close</span>
            </kbd>
          </div>

          {/* Search Input Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search messages in ${type === "channel" ? `#${name}` : name}...`}
              className="pl-9 pr-8 h-10 bg-zinc-100 dark:bg-[#1e1f24] border-black/10 dark:border-white/10 focus-visible:ring-1 focus-visible:ring-indigo-500 text-sm rounded-xl"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Results Area */}
        <div className="max-h-[380px] min-h-[160px] overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <GradientLoader className="w-7 h-7" />
              <p className="text-xs text-zinc-400 mt-2">Searching messages...</p>
            </div>
          ) : !hasSearched || !query.trim() ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-400 mb-2">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Type a keyword to start searching
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-[260px]">
                Search through history in {type === "channel" ? `#${name}` : name} by content, terms, or phrases.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-400 mb-2">
                <Search className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No messages found
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                We couldn&apos;t find any messages matching &ldquo;{query}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span>
                  {results.length} {results.length === 1 ? "match" : "matches"} found
                </span>
                <span>Click a result to jump to it</span>
              </div>

              {results.map((message) => {
                const profile = message.member?.profile;
                const role = message.member?.role as keyof typeof roleIconMap;
                const createdAtDate = new Date(message.createdAt);
                const fileType = message.fileUrl?.split(".").pop()?.toLowerCase();
                const isPDF = fileType === "pdf" && message.fileUrl;
                const isImage = !isPDF && message.fileUrl;

                return (
                  <div
                    key={message.id}
                    onClick={() => jumpToMessage(message.id)}
                    className="group relative flex flex-col p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15 border border-black/5 dark:border-white/5 hover:border-indigo-500/30 cursor-pointer transition-all duration-150"
                  >
                    <div className="flex items-center justify-between gap-x-2">
                      <div className="flex items-center gap-x-2 min-w-0">
                        <UserAvatar
                          src={profile?.imageUrl}
                          className="h-6 w-6 rounded-full ring-1 ring-black/5 dark:ring-white/10 shrink-0"
                        />
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {profile?.name || "User"}
                        </span>
                        {role && roleIconMap[role]}
                      </div>

                      <div className="flex items-center gap-x-2 shrink-0">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-x-1">
                          <Clock className="w-3 h-3" />
                          {format(createdAtDate, "d MMM yyyy, HH:mm")}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-indigo-500 text-white transition-opacity">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Highlighted Message Snippet */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 line-clamp-3 break-words font-normal pl-8">
                      {renderHighlightedText(message.content, query)}
                    </p>

                    {/* Attachment Tag */}
                    {message.fileUrl && (
                      <div className="mt-2 pl-8 flex items-center gap-x-1.5 text-[10px] font-medium text-indigo-500 dark:text-indigo-400">
                        {isImage ? (
                          <>
                            <ImageIcon className="w-3 h-3" />
                            <span>Image attachment</span>
                          </>
                        ) : isPDF ? (
                          <>
                            <FileIcon className="w-3 h-3" />
                            <span>PDF document</span>
                          </>
                        ) : (
                          <>
                            <FileIcon className="w-3 h-3" />
                            <span>Attachment</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
