"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import qs from "query-string";
import { formatDistanceToNow, format } from "date-fns";
import {
  Pin,
  PinOff,
  Clock,
  Sparkles,
  ExternalLink,
  Trash2,
  Calendar,
  X
} from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { GradientLoader } from "@/components/ui/loader";
import { useSocket } from "@/components/providers/socket-provider";
import { useModal } from "@/hooks/use-modal-store";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface PinnedMessagesPopoverProps {
  chatId: string;
  type: "channel" | "conversation";
  socketUrl: string;
  socketQuery: Record<string, string>;
}

export function PinnedMessagesPopover({
  chatId,
  type,
  socketUrl,
  socketQuery
}: PinnedMessagesPopoverProps) {
  const { socket } = useSocket();
  const { onOpen } = useModal();
  let queryClient: any = null;
  try {
    queryClient = useQueryClient();
  } catch {
    // Graceful fallback
  }

  const [isOpen, setIsOpen] = useState(false);
  const [pins, setPins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPins = async () => {
    if (!chatId) return;
    try {
      setIsLoading(true);
      const endpoint =
        type === "channel"
          ? `/api/channels/${chatId}/pins`
          : `/api/direct-messages/${chatId}/pins`;
      const res = await axios.get(endpoint);
      setPins(res.data);
    } catch (error) {
      console.error("Failed to fetch pinned messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPins();
  }, [chatId, type]);

  // Real-time socket listener for pin updates
  useEffect(() => {
    if (!socket || !chatId) return;

    const pinKey = `chat:${chatId}:pins:update`;
    const messageUpdateKey = `chat:${chatId}:messages:update`;

    const handleUpdate = (updatedMessage: any) => {
      setPins((prev) => {
        const isCurrentlyActivePin =
          updatedMessage.pinned &&
          (!updatedMessage.pinExpiresAt ||
            new Date(updatedMessage.pinExpiresAt) > new Date()) &&
          !updatedMessage.deleted;

        const exists = prev.some((p) => p.id === updatedMessage.id);

        if (isCurrentlyActivePin) {
          if (exists) {
            return prev.map((p) =>
              p.id === updatedMessage.id ? updatedMessage : p
            );
          } else {
            return [updatedMessage, ...prev];
          }
        } else {
          return prev.filter((p) => p.id !== updatedMessage.id);
        }
      });
    };

    socket.on(pinKey, handleUpdate);
    socket.on(messageUpdateKey, handleUpdate);

    return () => {
      socket.off(pinKey, handleUpdate);
      socket.off(messageUpdateKey, handleUpdate);
    };
  }, [socket, chatId]);

  const handleUnpin = async (messageId: string) => {
    setPins((prev) => prev.filter((p) => p.id !== messageId));

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
              item.id === messageId
                ? { ...item, pinned: false, pinnedAt: null, pinExpiresAt: null }
                : item
            )
          }))
        };
      });
    }

    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${messageId}`,
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

  const jumpToMessage = (messageId: string) => {
    setIsOpen(false);
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add(
        "ring-2",
        "ring-purple-500",
        "bg-purple-500/15",
        "transition-all",
        "duration-500"
      );
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-purple-500", "bg-purple-500/15");
      }, 2500);
    }
  };

  const activePinsCount = pins.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => {
            if (!isOpen) fetchPins();
          }}
          className={cn(
            "relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center focus:outline-none",
            isOpen || activePinsCount > 0
              ? "bg-purple-500/15 text-purple-400 dark:text-purple-300 hover:bg-purple-500/25"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5"
          )}
          title="Pinned Messages"
        >
          <Pin className={cn("w-4 h-4", activePinsCount > 0 && "fill-current")} />
          {activePinsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#1b1d25]">
              {activePinsCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-80 sm:w-96 p-0 rounded-2xl bg-[#1e1f24]/95 border border-white/10 shadow-2xl backdrop-blur-2xl text-zinc-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#16171a]">
          <div className="flex items-center gap-x-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-sm shadow-purple-500/30">
              <Pin className="w-3.5 h-3.5 fill-white" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Pinned Messages
              </h3>
              <p className="text-[10px] text-zinc-400">
                {activePinsCount} {activePinsCount === 1 ? "pin" : "pins"} in this {type}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-2 divide-y divide-white/5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <GradientLoader className="w-6 h-6" />
              <p className="text-xs text-zinc-400 mt-2">Loading pinned messages...</p>
            </div>
          ) : pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="p-3 rounded-2xl bg-white/5 text-zinc-500 mb-2">
                <PinOff className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-zinc-300">No pinned messages yet</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-[220px]">
                Hover over any message and click the pin icon to pin it with a custom timeline.
              </p>
            </div>
          ) : (
            pins.map((pin) => {
              const hasExpiry = Boolean(pin.pinExpiresAt);
              const expiryDate = hasExpiry ? new Date(pin.pinExpiresAt) : null;
              const isExpired = expiryDate ? expiryDate <= new Date() : false;

              if (isExpired) return null;

              return (
                <div
                  key={pin.id}
                  className="group relative p-2.5 pt-3 rounded-xl hover:bg-white/5 transition-all duration-150 border border-transparent hover:border-white/5"
                >
                  <div className="flex items-start justify-between gap-x-2">
                    <div className="flex items-center gap-x-2 min-w-0">
                      <UserAvatar
                        src={pin.member?.profile?.imageUrl}
                        className="h-6 w-6 rounded-full ring-1 ring-white/10 shrink-0"
                      />
                      <span className="text-xs font-bold text-white truncate">
                        {pin.member?.profile?.name || "User"}
                      </span>
                    </div>

                    {/* Timeline Expiry Tag */}
                    <div className="shrink-0">
                      {hasExpiry && expiryDate ? (
                        <ActionTooltip
                          label={`Expires on ${format(
                            expiryDate,
                            "MMM d, yyyy 'at' h:mm a"
                          )}`}
                        >
                          <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[10px] font-medium text-pink-300">
                            <Clock className="w-2.5 h-2.5" />
                            Expires in{" "}
                            {formatDistanceToNow(expiryDate, { addSuffix: false })}
                          </span>
                        </ActionTooltip>
                      ) : (
                        <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-medium text-purple-300">
                          <Pin className="w-2.5 h-2.5 fill-purple-400" /> Permanent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Preview */}
                  <p className="text-xs text-zinc-300 mt-2 line-clamp-3 break-words font-normal pl-8">
                    {pin.content.replace(/^\[reply:\{.*?\}\]/, "")}
                  </p>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-x-1.5 mt-2.5 pl-8">
                    <button
                      type="button"
                      onClick={() =>
                        onOpen("pinMessage", {
                          message: pin,
                          socketUrl,
                          socketQuery
                        })
                      }
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-purple-300 hover:bg-purple-500/10 transition"
                    >
                      Edit Timeline
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUnpin(pin.id)}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-x-1"
                    >
                      <PinOff className="w-3 h-3" />
                      Unpin
                    </button>

                    <button
                      type="button"
                      onClick={() => jumpToMessage(pin.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition flex items-center gap-x-1 shadow-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Jump
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PinnedMessagesPopover;
