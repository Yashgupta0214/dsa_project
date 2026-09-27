"use client";

import React, { useEffect, useState } from "react";
import { PhoneCall, PhoneOff, Video, VideoOff } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import qs from "query-string";

import { ActionTooltip } from "@/components/action-tooltip";
import { useSocket } from "@/components/providers/socket-provider";
import { usePresence } from "@/components/providers/presence-provider";

interface ChatVideoButtonProps {
  conversationId?: string;
  serverId?: string;
  currentMemberId?: string;
  otherMemberId?: string;
  otherUserId?: string;
  otherProfileId?: string;
  otherMemberName?: string;
  otherMemberAvatar?: string;
}

export function ChatVideoButton({
  conversationId,
  serverId,
  currentMemberId,
  otherMemberId,
  otherUserId,
  otherProfileId,
  otherMemberName,
  otherMemberAvatar
}: ChatVideoButtonProps) {
  const searchParams = useSearchParams();
  const pathName = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { userId } = useAuth();
  const { myProfileId } = usePresence();
  const { socket } = useSocket();

  const isVideo = searchParams?.get("video") === "true";
  const [callDeclinedNotice, setCallDeclinedNotice] = useState(false);

  // Listen for call decline notification
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleDeclined = (data: { conversationId?: string }) => {
      if (data?.conversationId === conversationId) {
        setCallDeclinedNotice(true);
        setTimeout(() => setCallDeclinedNotice(false), 4000);
      }
    };

    socket.on("call:declined", handleDeclined);
    return () => {
      socket.off("call:declined", handleDeclined);
    };
  }, [socket, conversationId]);

  const Icon = isVideo ? PhoneOff : Video;
  const tooltipLabel = callDeclinedNotice
    ? `${otherMemberName || "User"} declined the call`
    : isVideo
    ? "End Call"
    : "Start Video / Voice Call";

  const onClick = async () => {
    const nextIsVideo = !isVideo;

    const url = qs.stringifyUrl(
      {
        url: pathName || "",
        query: {
          video: nextIsVideo ? true : undefined
        }
      },
      { skipNull: true }
    );

    // 1. If starting a call, send incoming call notification to recipient
    if (nextIsVideo && conversationId) {
      const callUrl = serverId && currentMemberId
        ? `/servers/${serverId}/conversations/${currentMemberId}?video=true`
        : `/direct-messages/${currentMemberId || ""}?video=true`;

      const payload = {
        callId: `call_${conversationId}_${Date.now()}`,
        conversationId,
        serverId,
        callUrl,
        isVideo: true,
        caller: {
          userId: userId || "",
          profileId: myProfileId || "",
          memberId: currentMemberId || "",
          name: user?.fullName || user?.username || "Friend",
          imageUrl: user?.imageUrl
        },
        recipient: {
          userId: otherUserId || "",
          profileId: otherProfileId || "",
          memberId: otherMemberId || "",
          name: otherMemberName,
          imageUrl: otherMemberAvatar
        },
        createdAt: Date.now()
      };

      // Real-time socket emission
      if (socket) {
        socket.emit("call:initiate", payload);
      }

      // Guaranteed HTTP API emission
      axios
        .post("/api/socket/direct-messages/call", {
          conversationId,
          serverId,
          action: "initiate",
          isVideo: true
        })
        .catch(() => {});
    }

    // 2. If ending a call, cancel ringing on callee
    if (!nextIsVideo && conversationId) {
      if (socket) {
        socket.emit("call:cancel", { conversationId });
      }

      axios
        .post("/api/socket/direct-messages/call", {
          conversationId,
          serverId,
          action: "cancel"
        })
        .catch(() => {});
    }

    router.push(url);
  };

  return (
    <div className="flex items-center gap-1.5 mr-2">
      {callDeclinedNotice && (
        <span className="hidden sm:inline text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 animate-in fade-in">
          Call declined
        </span>
      )}

      <ActionTooltip side="bottom" label={tooltipLabel}>
        <button
          onClick={onClick}
          className={`flex items-center justify-center p-2 rounded-xl transition ${
            isVideo
              ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/30"
              : "text-zinc-500 dark:text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <Icon className="h-5 w-5" />
        </button>
      </ActionTooltip>
    </div>
  );
}
