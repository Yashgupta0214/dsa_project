"use client";

import React, { useEffect, useState } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
} from "@livekit/components-react";
import { useUser } from "@clerk/nextjs";
import { GradientLoader } from "@/components/ui/loader";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
}

export function MediaRoom({ chatId, video, audio }: MediaRoomProps) {
  const { user } = useUser();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [mediaState, setMediaState] = useState({
    audioEnabled: audio,
    videoEnabled: video,
  });

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        setError("");
        setToken("");
        setIsJoined(false);

        const params = new URLSearchParams({
          room: chatId,
          identity: user.id,
          name:
            user.fullName ||
            user.username ||
            user.primaryEmailAddress?.emailAddress ||
            "User",
        });

        const response = await fetch(
          `/api/livekit?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create LiveKit token");
        }

        setToken(data.token);
      } catch (error) {
        console.error(error);
        setError(
          error instanceof Error
            ? error.message
            : "Could not prepare the call"
        );
      }
    })();
  }, [
    user?.id,
    user?.fullName,
    user?.username,
    user?.primaryEmailAddress?.emailAddress,
    chatId,
  ]);

  if (error)
    return (
      <div className="flex flex-col flex-1 justify-center items-center px-6 text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Could not join the call
        </p>
        <p className="mt-2 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
          {error}
        </p>
      </div>
    );

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!livekitUrl)
    return (
      <div className="flex flex-col flex-1 justify-center items-center px-6 text-center">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          LiveKit is not configured
        </p>
        <p className="mt-2 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
          Add NEXT_PUBLIC_LIVEKIT_URL to your environment variables.
        </p>
      </div>
    );

  if (token === "")
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <GradientLoader className="h-8 w-8 my-4" />
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Loading call...
        </p>
      </div>
    );

  if (!isJoined) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#1e1f24] p-6">
        <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-[#2b2d31]/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                Ready to join
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-white">
                {user?.fullName ?? user?.username ?? "User"}
              </h3>
            </div>
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              Live
            </div>
          </div>

          <PreJoin
            className="!bg-transparent !p-0 !shadow-none"
            defaults={{
              audioEnabled: mediaState.audioEnabled,
              videoEnabled: mediaState.videoEnabled,
            }}
            joinLabel="Join Call"
            micLabel="Microphone"
            camLabel="Camera"
            userLabel="Display name"
            onError={(error) => {
              console.error("LiveKit pre-join error:", error);
            }}
            onSubmit={(values) => {
              setMediaState({
                audioEnabled: values.audioEnabled,
                videoEnabled: values.videoEnabled,
              });
              setIsJoined(true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={mediaState.videoEnabled}
      audio={mediaState.audioEnabled}
      token={token}
      connect={true}
      serverUrl={livekitUrl}
      data-lk-theme="default"
      onDisconnected={() => setIsJoined(false)}
      onError={(error) => {
        console.error("LiveKit room error:", error);
        setError(error.message);
      }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
