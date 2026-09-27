"use client";

import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCheck,
  Check,
  Clock,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Users,
  MessageSquare
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { UserAvatar } from "@/components/user-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const roleIconMap: Record<string, React.ReactNode> = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-3.5 w-3.5 ml-1 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-3.5 w-3.5 ml-1 text-rose-500" />
};

export function MessageSeenModal() {
  const { isOpen, onClose, type, data } = useModal();

  const isModalOpen = isOpen && type === "messageSeenBy";
  const { seenData } = data || {};

  if (!seenData) return null;

  const {
    content,
    timestamp,
    isDM,
    seen,
    seenAt,
    recipientName,
    recipientAvatar,
    readReceipts = []
  } = seenData;

  const readCount = isDM ? (seen ? 1 : 0) : readReceipts.length;

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#18191c] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-md w-full">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-black/5 dark:border-white/5 bg-zinc-50/80 dark:bg-[#111214]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-500">
              <CheckCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Message Info</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500 dark:text-sky-300 border border-sky-500/30">
                  Read Receipts
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Sent at {timestamp}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Message Snippet Box */}
        <div className="p-4 px-5 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-left">
          <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>Message</span>
          </p>
          <p className="text-xs text-zinc-700 dark:text-zinc-200 line-clamp-3 italic bg-zinc-100 dark:bg-white/[0.04] p-2.5 rounded-xl border border-black/5 dark:border-white/5">
            "{content || "Attachment / File"}"
          </p>
        </div>

        {/* Seen By List */}
        <div className="p-5 text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Eye className="w-3.5 h-3.5 text-sky-500" />
              <span>Seen By ({readCount})</span>
            </div>
            {readCount > 0 && (
              <span className="text-[11px] font-semibold text-sky-500 dark:text-sky-400">
                ✓✓ Read
              </span>
            )}
          </div>

          <ScrollArea className="max-h-[240px] pr-2">
            {/* Direct Message Mode */}
            {isDM ? (
              seen ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      src={recipientAvatar}
                      name={recipientName}
                      className="h-8 w-8 ring-1 ring-white/10"
                    />
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {recipientName || "Recipient"}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {seenAt
                          ? `Seen ${formatDistanceToNow(new Date(seenAt), { addSuffix: true })} (${format(new Date(seenAt), "h:mm a")})`
                          : "Seen"}
                      </p>
                    </div>
                  </div>
                  <CheckCheck className="w-4 h-4 text-sky-500 stroke-[2.5]" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1 text-zinc-400">
                  <Check className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-400">Delivered</p>
                  <p className="text-[11px] text-zinc-500">
                    The recipient hasn't opened this message yet.
                  </p>
                </div>
              )
            ) : (
              /* Channel Mode */
              readReceipts.length > 0 ? (
                <div className="space-y-2">
                  {readReceipts.map((receipt, idx) => {
                    const memberProfile = receipt.member?.profile;
                    const role = receipt.member?.role || "GUEST";
                    const readTime = receipt.readAt ? new Date(receipt.readAt) : null;

                    return (
                      <div
                        key={receipt.memberId || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:bg-sky-500/5 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={memberProfile?.imageUrl}
                            name={memberProfile?.name}
                            className="h-8 w-8 ring-1 ring-white/10"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                                {memberProfile?.name || "Member"}
                              </p>
                              {roleIconMap[role]}
                            </div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              {readTime
                                ? `Read ${formatDistanceToNow(readTime, { addSuffix: true })} (${format(readTime, "MMM d, h:mm a")})`
                                : "Read"}
                            </p>
                          </div>
                        </div>
                        <CheckCheck className="w-3.5 h-3.5 text-sky-500 stroke-[2.5]" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-1 text-zinc-400">
                  <Check className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-400">Delivered to channel</p>
                  <p className="text-[11px] text-zinc-500">
                    No members have opened and read this message yet.
                  </p>
                </div>
              )
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-black/5 dark:border-white/5 flex items-center justify-end bg-zinc-50/80 dark:bg-[#111214]/80">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
