"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PhoneCall, PhoneOff, Video, Volume2, X } from "lucide-react";
import axios from "axios";

import { useSocket } from "@/components/providers/socket-provider";
import { usePresence } from "@/components/providers/presence-provider";
import {
  startRingtone,
  stopRingtone,
  playCallEndSound
} from "@/lib/notification-sound";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type IncomingCallPayload = {
  callId: string;
  conversationId: string;
  serverId?: string;
  callUrl: string;
  isVideo: boolean;
  caller: {
    userId: string;
    profileId: string;
    memberId: string;
    name: string;
    imageUrl?: string;
  };
  recipient: {
    userId: string;
    profileId?: string;
    memberId?: string;
    name?: string;
    imageUrl?: string;
  };
  createdAt: number;
};

export function IncomingCallModal() {
  const { socket, isConnected } = useSocket();
  const { userId } = useAuth();
  const { myProfileId } = usePresence();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [call, setCall] = useState<IncomingCallPayload | null>(null);
  const [callStatus, setCallStatus] = useState<"ringing" | "cancelled" | "declined" | "missed">("ringing");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  // Close and clean up call alert
  const dismissCall = useCallback(() => {
    stopRingtone();
    clearAllTimers();
    setCall(null);
    setCallStatus("ringing");
  }, []);

  // Handle Accept
  const handleAccept = useCallback(() => {
    if (!call) return;

    stopRingtone();
    clearAllTimers();

    // Signal acceptance to socket & API
    if (socket) {
      socket.emit("call:accept", {
        conversationId: call.conversationId,
        callerUserId: call.caller.userId
      });
    }

    axios
      .post("/api/socket/direct-messages/call", {
        conversationId: call.conversationId,
        serverId: call.serverId,
        action: "accept"
      })
      .catch(() => {});

    const targetUrl = call.callUrl;
    setCall(null);
    router.push(targetUrl);
  }, [call, socket, router]);

  // Handle Decline
  const handleDecline = useCallback(() => {
    if (!call) return;

    stopRingtone();
    playCallEndSound();
    clearAllTimers();

    if (socket) {
      socket.emit("call:decline", {
        conversationId: call.conversationId,
        callerUserId: call.caller.userId
      });
    }

    axios
      .post("/api/socket/direct-messages/call", {
        conversationId: call.conversationId,
        serverId: call.serverId,
        action: "decline"
      })
      .catch(() => {});

    setCallStatus("declined");
    dismissTimerRef.current = setTimeout(() => {
      dismissCall();
    }, 1200);
  }, [call, socket, dismissCall]);

  // Listen to socket call events
  useEffect(() => {
    if (!socket || !userId) return;

    const handleIncomingCall = (payload: IncomingCallPayload) => {
      if (!payload || !payload.caller) return;

      // Ensure this call is intended for the current user
      const isTargetRecipient =
        payload.recipient?.userId === userId ||
        (myProfileId && payload.recipient?.profileId === myProfileId);

      const isCallerMyself = payload.caller.userId === userId;

      if (!isTargetRecipient || isCallerMyself) return;

      // Don't ring if user is already inside this call room
      const isInThisCall =
        pathname?.includes(payload.conversationId) &&
        searchParams?.get("video") === "true";

      if (isInThisCall) return;

      // Stop previous ringing if any
      stopRingtone();
      clearAllTimers();

      setCall(payload);
      setCallStatus("ringing");

      // Start ringing audio chime
      startRingtone();

      // Show Desktop/System Notification
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const notifTitle = `📞 Incoming ${payload.isVideo ? "Video" : "Voice"} Call`;
          const notif = new Notification(notifTitle, {
            body: `${payload.caller.name} is calling you. Click to answer!`,
            icon: payload.caller.imageUrl || "/favicon.ico",
            badge: "/favicon.ico",
            tag: `call-${payload.conversationId}`,
            requireInteraction: true
          });

          notif.onclick = () => {
            window.focus();
            stopRingtone();
            setCall(null);
            router.push(payload.callUrl);
            notif.close();
          };
        } catch (e) {
          console.warn("Could not display native call notification:", e);
        }
      }

      // Auto-timeout after 35 seconds if unanswered
      timeoutRef.current = setTimeout(() => {
        stopRingtone();
        playCallEndSound();
        setCallStatus("missed");
        dismissTimerRef.current = setTimeout(() => {
          dismissCall();
        }, 2000);
      }, 35000);
    };

    const handleCallCancelled = (data: { conversationId?: string }) => {
      if (!call) return;
      if (!data?.conversationId || data.conversationId === call.conversationId) {
        stopRingtone();
        playCallEndSound();
        setCallStatus("cancelled");
        dismissTimerRef.current = setTimeout(() => {
          dismissCall();
        }, 1500);
      }
    };

    const handleCallDeclined = (data: { conversationId?: string }) => {
      if (!call) return;
      if (!data?.conversationId || data.conversationId === call.conversationId) {
        stopRingtone();
        playCallEndSound();
        setCallStatus("declined");
        dismissTimerRef.current = setTimeout(() => {
          dismissCall();
        }, 1200);
      }
    };

    socket.on("call:incoming", handleIncomingCall);
    socket.on("call:cancelled", handleCallCancelled);
    socket.on("call:declined", handleCallDeclined);

    return () => {
      socket.off("call:incoming", handleIncomingCall);
      socket.off("call:cancelled", handleCallCancelled);
      socket.off("call:declined", handleCallDeclined);
    };
  }, [
    socket,
    userId,
    myProfileId,
    pathname,
    searchParams,
    call,
    router,
    dismissCall
  ]);

  // Clean up ringtone on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      clearAllTimers();
    };
  }, []);

  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-center sm:justify-end p-4 sm:p-6">
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl bg-[#1e1f22]/95 border-2 border-emerald-500/60 text-white shadow-[0_20px_60px_-15px_rgba(16,185,129,0.4)] backdrop-blur-2xl p-5 animate-in fade-in slide-in-from-top-6 duration-300 transition-all">
        {/* Top Header info */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {call.isVideo ? "Incoming Video Call" : "Incoming Voice Call"}
          </div>

          <button
            type="button"
            onClick={handleDecline}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Avatar with animated pulsing radar ripples */}
        <div className="flex flex-col items-center text-center my-2">
          <div className="relative mb-3 flex items-center justify-center">
            {callStatus === "ringing" && (
              <>
                <span className="absolute -inset-3 rounded-full border-2 border-emerald-500/50 animate-ping opacity-60" />
                <span className="absolute -inset-6 rounded-full border border-emerald-500/30 animate-pulse opacity-40" />
              </>
            )}
            <Avatar className="h-20 w-20 ring-4 ring-emerald-500/70 shadow-2xl">
              <AvatarImage src={call.caller.imageUrl} />
              <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-emerald-600 text-white font-black text-2xl">
                {call.caller.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight truncate max-w-[260px]">
            {call.caller.name}
          </h3>

          {/* Dynamic Status / Equalizer */}
          {callStatus === "ringing" && (
            <div className="flex items-center gap-2 mt-1 text-xs font-medium text-emerald-400">
              <div className="flex items-end gap-1 h-3.5">
                <span className="w-1 h-full bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-full bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-full bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>Ringing...</span>
            </div>
          )}

          {callStatus === "cancelled" && (
            <p className="text-xs text-rose-400 font-semibold mt-1">
              Call cancelled by caller
            </p>
          )}

          {callStatus === "declined" && (
            <p className="text-xs text-zinc-400 font-semibold mt-1">
              Call declined
            </p>
          )}

          {callStatus === "missed" && (
            <p className="text-xs text-amber-400 font-semibold mt-1">
              Missed call
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {callStatus === "ringing" && (
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Button
              type="button"
              onClick={handleDecline}
              className="h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <PhoneOff className="w-5 h-5" />
              <span>Decline</span>
            </Button>

            <Button
              type="button"
              onClick={handleAccept}
              className="h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/40 flex items-center justify-center gap-2 transition active:scale-95"
            >
              {call.isVideo ? <Video className="w-5 h-5" /> : <PhoneCall className="w-5 h-5" />}
              <span>Accept</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
