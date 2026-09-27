"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  Hash
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";

interface ChatSummaryButtonProps {
  chatId: string;
  name: string;
  type: "channel" | "conversation";
}

interface SummaryData {
  title: string;
  passage: string;
  totalMessages: number;
}

export function ChatSummaryButton({ chatId, name, type }: ChatSummaryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const fetchSummary = async () => {
    if (!chatId) return;

    try {
      setIsLoading(true);
      const payload =
        type === "channel"
          ? { channelId: chatId }
          : { conversationId: chatId };

      const res = await axios.post("/api/chat-summary", payload);
      setSummaryData(res.data);
    } catch (err) {
      console.error("Failed to generate chat summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchSummary();
    }
  };

  const handleCopySummary = () => {
    if (!summaryData?.passage) return;

    const prefix = type === "channel" ? `#${name}` : `@${name}`;
    const text = `✨ Chat Summary for ${prefix}\n\n${summaryData.passage}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <ActionTooltip side="bottom" label="AI Chat Summary">
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="hidden sm:inline">AI Summary</span>
          </Button>
        </DialogTrigger>
      </ActionTooltip>

      <DialogContent className="bg-white dark:bg-[#18191e] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-lg w-full">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-black/5 dark:border-white/5 bg-zinc-50/90 dark:bg-[#121316]/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  AI Summary
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {type === "channel" ? <Hash className="w-2.5 h-2.5 inline mr-0.5" /> : "@"}
                    {name}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Concise overview of recent conversation activity
                </DialogDescription>
              </div>
            </div>

            {!isLoading && (
              <ActionTooltip side="left" label="Regenerate Summary">
                <button
                  type="button"
                  onClick={fetchSummary}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </ActionTooltip>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Generating AI summary...
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Reading and summarizing recent chat messages
                </p>
              </div>
            </div>
          ) : !summaryData || !summaryData.passage || summaryData.totalMessages === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No recent messages
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                There are no recent messages in this conversation to summarize yet.
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl bg-zinc-50 dark:bg-[#121316] border border-black/5 dark:border-white/5 p-4.5 pl-5 shadow-sm">
              {/* Left subtle gradient accent indicator */}
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-purple-500" />
              
              <p className="text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal select-text whitespace-pre-wrap">
                {summaryData.passage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-zinc-50/90 dark:bg-[#121316]/90 backdrop-blur-md">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {summaryData?.totalMessages ? `${summaryData.totalMessages} messages analyzed` : ""}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading || !summaryData}
              onClick={handleCopySummary}
              className="h-8 px-3 rounded-xl text-xs font-medium border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 transition active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Copy</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
