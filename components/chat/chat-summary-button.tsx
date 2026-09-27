"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Clock,
  MessageSquare,
  Users,
  CheckCircle2,
  ExternalLink,
  Bot,
  Zap,
  ChevronRight,
  ListTodo
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
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ChatSummaryButtonProps {
  chatId: string;
  name: string;
  type: "channel" | "conversation";
}

interface SummaryData {
  headline: string;
  summary: string;
  keyPoints: string[];
  topicBreakdown: Array<{ topic: string; description: string; participants: string[] }>;
  actionItems: string[];
  linksShared?: string[];
  participantContributions: Array<{
    name: string;
    avatar?: string;
    messageCount: number;
    summary: string;
  }>;
  totalMessages: number;
  timeRange: string;
}

export function ChatSummaryButton({ chatId, name, type }: ChatSummaryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [limit, setLimit] = useState(50);
  const [timeframe, setTimeframe] = useState<"all" | "today" | "24h" | "1h">("all");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const fetchSummary = async (selectedLimit = limit, selectedTimeframe = timeframe) => {
    if (!chatId) return;

    try {
      setIsLoading(true);
      const payload =
        type === "channel"
          ? { channelId: chatId, limit: selectedLimit, timeframe: selectedTimeframe }
          : { conversationId: chatId, limit: selectedLimit, timeframe: selectedTimeframe };

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
    if (open && !summaryData) {
      fetchSummary();
    }
  };

  const handleFilterChange = (newLimit: number, newTimeframe: "all" | "today" | "24h" | "1h") => {
    setLimit(newLimit);
    setTimeframe(newTimeframe);
    fetchSummary(newLimit, newTimeframe);
  };

  const handleCopySummary = () => {
    if (!summaryData) return;

    let text = `✨ **Catch-Up Summary for #${name}**\n\n`;
    text += `📅 **Time Range:** ${summaryData.timeRange} (${summaryData.totalMessages} messages)\n\n`;
    text += `📌 **Overview:**\n${summaryData.summary}\n\n`;

    if (summaryData.keyPoints?.length > 0) {
      text += `🔑 **Key Highlights:**\n`;
      summaryData.keyPoints.forEach((point) => {
        text += `- ${point}\n`;
      });
      text += `\n`;
    }

    if (summaryData.actionItems?.length > 0) {
      text += `📋 **Action Items & Decisions:**\n`;
      summaryData.actionItems.forEach((item) => {
        text += `- ${item}\n`;
      });
      text += `\n`;
    }

    if (summaryData.participantContributions?.length > 0) {
      text += `👥 **Participants:**\n`;
      summaryData.participantContributions.forEach((p) => {
        text += `- **${p.name}** (${p.messageCount} msgs): ${p.summary}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <ActionTooltip side="bottom" label="Catch Up & Summarize Chat">
        <DialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 rounded-lg bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 hover:from-indigo-500/25 hover:via-purple-500/25 hover:to-pink-500/25 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 border border-indigo-500/20 dark:border-indigo-500/30 font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 active:scale-95 group"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-12 transition-transform duration-300" />
            <span className="hidden sm:inline font-bold">Catch Up</span>
          </Button>
        </DialogTrigger>
      </ActionTooltip>

      <DialogContent className="bg-white dark:bg-[#18191c] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-black/5 dark:border-white/5 shrink-0 bg-zinc-50/80 dark:bg-[#111214]/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Chat Catch-Up Summary</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Smart AI
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                  <span>Summarizing conversation in</span>
                  <strong className="text-indigo-500 dark:text-indigo-400">#{name}</strong>
                  {summaryData?.timeRange && <span>• {summaryData.timeRange}</span>}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleFilterChange(25, "today")}
                className={`h-7 px-2 text-[11px] rounded-lg transition ${
                  limit === 25 ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Today
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleFilterChange(50, "all")}
                className={`h-7 px-2 text-[11px] rounded-lg transition ${
                  limit === 50 ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Last 50
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleFilterChange(100, "all")}
                className={`h-7 px-2 text-[11px] rounded-lg transition ${
                  limit === 100 ? "bg-indigo-600 text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Last 100
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Summary Body */}
        <ScrollArea className="flex-1 p-5 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-bold text-white">Synthesizing chat messages...</p>
              <p className="text-xs text-zinc-400 max-w-xs">
                Analyzing discussion topics, key decisions, and member contributions.
              </p>
            </div>
          ) : !summaryData || summaryData.totalMessages === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-zinc-500" />
              <p className="text-sm font-bold text-zinc-300">No messages found to summarize</p>
              <p className="text-xs text-zinc-500">
                Start chatting in #{name} to see real-time catch-up summaries here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              {/* 1. Executive Summary Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 shadow-sm space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wide">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Executive Overview</span>
                </div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
                  {summaryData.summary}
                </p>
              </div>

              {/* 2. Key Discussion Highlights */}
              {summaryData.keyPoints?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Key Discussion Highlights</span>
                  </h4>
                  <div className="space-y-1.5">
                    {summaryData.keyPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 leading-normal"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="flex-1">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Action Items & Decisions */}
              {summaryData.actionItems?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Action Items & Decisions</span>
                  </h4>
                  <div className="space-y-1.5">
                    {summaryData.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-zinc-800 dark:text-emerald-200 leading-normal"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="flex-1">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Active Participants Breakdown */}
              {summaryData.participantContributions?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>Participant Contributions ({summaryData.participantContributions.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summaryData.participantContributions.map((participant, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5"
                      >
                        <UserAvatar
                          src={participant.avatar}
                          name={participant.name}
                          className="h-8 w-8 ring-1 ring-white/10 shrink-0 mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {participant.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              {participant.messageCount} msgs
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-tight">
                            {participant.summary}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Shared Links */}
              {summaryData.linksShared && summaryData.linksShared.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Shared Links & Resources</span>
                  </h4>
                  <div className="space-y-1">
                    {summaryData.linksShared.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] hover:bg-indigo-500/10 border border-black/5 dark:border-white/5 text-xs text-indigo-500 dark:text-indigo-300 hover:underline truncate transition"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-3.5 px-5 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-zinc-50/80 dark:bg-[#111214]/80 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{summaryData?.totalMessages || 0} messages analyzed</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading || !summaryData}
              onClick={() => fetchSummary()}
              className="h-8 px-3 rounded-xl border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isLoading || !summaryData || summaryData.totalMessages === 0}
              onClick={handleCopySummary}
              className="h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Summary"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
