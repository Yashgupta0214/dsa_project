"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  MessageSquare
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
  summaryPoints: string[];
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
    if (!summaryData) return;

    let text = `✨ Chat Summary for #${name}\n\n`;
    summaryData.summaryPoints.forEach((point) => {
      text += `• ${point.replace(/\*\*/g, "")}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <ActionTooltip side="bottom" label="Chat Summary">
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20 font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-12 transition-transform duration-300" />
            <span className="hidden sm:inline">Summary</span>
          </Button>
        </DialogTrigger>
      </ActionTooltip>

      <DialogContent className="bg-white dark:bg-[#18191c] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-md w-full">
        {/* Simple Clean Header */}
        <DialogHeader className="p-5 pb-4 border-b border-black/5 dark:border-white/5 bg-zinc-50/80 dark:bg-[#111214]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">
                Chat Summary
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Recent discussion in <strong className="text-indigo-500 dark:text-indigo-400">#{name}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Clean Body */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Summarizing recent messages...
              </p>
            </div>
          ) : !summaryData || summaryData.summaryPoints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                No recent messages to summarize
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                What you missed:
              </p>
              <div className="space-y-2">
                {summaryData.summaryPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-100 dark:bg-white/[0.04] text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span
                      className="flex-1"
                      dangerouslySetInnerHTML={{
                        __html: point.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-900 dark:text-white font-semibold">$1</strong>')
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Simple Footer */}
        <div className="p-3.5 px-5 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-zinc-50/80 dark:bg-[#111214]/80">
          <span className="text-[11px] text-zinc-400">
            {summaryData ? `${summaryData.totalMessages} messages checked` : ""}
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading || !summaryData}
              onClick={handleCopySummary}
              className="h-8 px-3 rounded-lg text-xs font-medium border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
