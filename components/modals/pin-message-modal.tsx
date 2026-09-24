"use client";

import React, { useState } from "react";
import axios from "axios";
import qs from "query-string";
import { format, addHours, addDays } from "date-fns";
import {
  Pin,
  Clock,
  Calendar,
  Sparkles,
  PinOff,
  Check
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { GradientLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

type DurationOption = "permanent" | "1h" | "24h" | "7d" | "30d" | "custom";

const durationPresets: {
  id: DurationOption;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "permanent",
    label: "Permanent",
    sublabel: "Until manually unpinned",
    icon: <Pin className="w-4 h-4 text-purple-400 fill-purple-400" />
  },
  {
    id: "1h",
    label: "1 Hour",
    sublabel: "Quick announcement",
    icon: <Clock className="w-4 h-4 text-pink-400" />
  },
  {
    id: "24h",
    label: "24 Hours",
    sublabel: "Daily focus / 1 day",
    icon: <Clock className="w-4 h-4 text-fuchsia-400" />
  },
  {
    id: "7d",
    label: "7 Days",
    sublabel: "Weekly notice / 1 week",
    icon: <Calendar className="w-4 h-4 text-purple-400" />
  },
  {
    id: "30d",
    label: "30 Days",
    sublabel: "Monthly highlight / 1 month",
    icon: <Calendar className="w-4 h-4 text-pink-400" />
  },
  {
    id: "custom",
    label: "Custom Date & Time",
    sublabel: "Choose exact expiration timeline",
    icon: <Sparkles className="w-4 h-4 text-amber-400" />
  }
];

export function PinMessageModal() {
  const { isOpen, onClose, type, data } = useModal();
  const queryClient = useQueryClient();
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>("permanent");
  
  // Custom date default to 3 days from now in format YYYY-MM-DDTHH:mm
  const defaultCustomDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  const [customDateTime, setCustomDateTime] = useState(defaultCustomDate);
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "pinMessage";
  const { message, socketUrl, socketQuery } = data;

  if (!message) return null;

  const handleClose = () => {
    setIsLoading(false);
    setSelectedDuration("permanent");
    onClose();
  };

  const calculateExpiryDate = (): Date | null => {
    const now = new Date();
    switch (selectedDuration) {
      case "1h":
        return addHours(now, 1);
      case "24h":
        return addDays(now, 1);
      case "7d":
        return addDays(now, 7);
      case "30d":
        return addDays(now, 30);
      case "custom":
        return customDateTime ? new Date(customDateTime) : null;
      case "permanent":
      default:
        return null;
    }
  };

  const optimisticallyUpdateMessage = (pinned: boolean, pinExpiresAt: string | null) => {
    const targetKey = socketQuery?.channelId
      ? `chat:${socketQuery.channelId}`
      : socketQuery?.conversationId
      ? `chat:${socketQuery.conversationId}`
      : null;

    if (targetKey) {
      queryClient.setQueryData([targetKey], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: any) =>
              item.id === message.id
                ? {
                    ...item,
                    pinned,
                    pinnedAt: pinned ? new Date().toISOString() : null,
                    pinExpiresAt
                  }
                : item
            )
          }))
        };
      });
    }
  };

  const handlePin = async () => {
    const expiryDate = calculateExpiryDate();
    const expiryIso = expiryDate ? expiryDate.toISOString() : null;

    // Instant optimistic UI update & close
    optimisticallyUpdateMessage(true, expiryIso);
    handleClose();

    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${message.id}`,
        query: socketQuery
      });

      await axios.patch(url, {
        pinned: true,
        pinExpiresAt: expiryIso
      });
    } catch (error) {
      console.error("Failed to pin message:", error);
    }
  };

  const handleUnpin = async () => {
    // Instant optimistic UI update & close
    optimisticallyUpdateMessage(false, null);
    handleClose();

    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${message.id}`,
        query: socketQuery
      });

      await axios.patch(url, {
        pinned: false,
        pinExpiresAt: null
      });
    } catch (error) {
      console.error("Failed to unpin message:", error);
    }
  };

  // Min date for custom picker is current datetime
  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1e1f24] text-zinc-100 p-0 overflow-hidden border border-white/10 max-w-lg shadow-2xl backdrop-blur-2xl rounded-2xl">
        <DialogHeader className="pt-6 px-6 pb-2">
          <div className="flex items-center gap-x-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-400 text-white shadow-lg shadow-purple-500/25">
              <Pin className="w-5 h-5 fill-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-x-2">
                {message.pinned ? "Edit Pin Timeline" : "Pin Message to Channel"}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Set how long this message stays pinned for everyone in the group.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-2 space-y-4">
          {/* Message Preview Box */}
          <div className="rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3.5 flex items-start gap-x-3">
            <UserAvatar
              src={message.member?.profile?.imageUrl}
              className="h-9 w-9 rounded-full ring-1 ring-white/10 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-x-2">
                <span className="text-xs font-bold text-white truncate">
                  {message.member?.profile?.name || "Member"}
                </span>
                {message.pinned && (
                  <span className="inline-flex items-center gap-x-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-semibold text-purple-300">
                    <Pin className="w-2.5 h-2.5 fill-purple-400" /> Pinned
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 mt-1 line-clamp-3 break-words font-normal">
                {message.content.replace(/^\[reply:\{.*?\}\]/, "")}
              </p>
            </div>
          </div>

          {/* Timeline Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
              Choose Pin Duration / Timeline
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {durationPresets.map((preset) => {
                const isSelected = selectedDuration === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedDuration(preset.id)}
                    className={cn(
                      "flex items-start gap-x-3 p-3 rounded-xl border text-left transition-all duration-150 relative",
                      isSelected
                        ? "bg-gradient-to-r from-purple-950/40 via-purple-900/30 to-pink-950/30 border-purple-500/60 ring-1 ring-purple-500/40 text-white shadow-md shadow-purple-500/10"
                        : "bg-[#2b2d31]/50 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-[#2b2d31] hover:border-white/10"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-lg shrink-0 mt-0.5",
                        isSelected
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-white/5 text-zinc-400"
                      )}
                    >
                      {preset.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-semibold truncate",
                          isSelected ? "text-purple-200" : "text-zinc-300"
                        )}
                      >
                        {preset.label}
                      </p>
                      <p className="text-[11px] text-zinc-500 leading-tight truncate mt-0.5">
                        {preset.sublabel}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Picker (when Custom is selected) */}
          {selectedDuration === "custom" && (
            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="text-xs font-medium text-purple-300 flex items-center gap-x-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-pink-400" />
                Select Expiration Date & Time:
              </label>
              <input
                type="datetime-local"
                min={minDateTime}
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full bg-[#111214] border border-purple-500/40 focus:border-pink-400 text-white text-xs rounded-lg px-3 py-2 outline-none transition focus:ring-1 focus:ring-pink-400"
              />
              <p className="text-[11px] text-zinc-400 mt-1.5">
                The message will automatically unpin after this time.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="bg-[#18191c] px-6 py-4 flex items-center justify-between gap-x-2 border-t border-white/5">
          {message.pinned ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={handleUnpin}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs flex items-center gap-x-1.5"
            >
              <PinOff className="w-3.5 h-3.5" />
              Unpin Message
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-x-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={handleClose}
              className="text-zinc-400 hover:text-white hover:bg-white/5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={handlePin}
              className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-400 text-white font-semibold text-xs shadow-lg shadow-purple-500/25 px-4 h-9 flex items-center gap-x-1.5"
            >
              {isLoading ? (
                <GradientLoader className="w-4 h-4" />
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5 fill-white" />
                  {message.pinned ? "Save Pin Duration" : "Pin Message"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PinMessageModal;
