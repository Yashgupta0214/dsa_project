"use client";

import React, { useEffect, useState } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
} from "@livekit/components-react";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
}

export function MediaRoom({ chatId, video, audio }: MediaRoomProps) {
  const { user } = useUser();
  const [token, setToken] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [mediaState, setMediaState] = useState({
    audioEnabled: audio,
    videoEnabled: video,
  });

  useEffect(() => {
    if (!user?.firstName) return;

    (async () => {
      try {
        const response = await fetch(
          `/api/livekit?room=${chatId}&username=${user.firstName}`
        );
        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [user?.firstName, chatId]);

  if (token === "")
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2 className="h-7 w-7 text-zinc-500 animate-spin my-4" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading...
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
                {user?.firstName ?? "User"}
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

  const livekitUrl =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL;

  return (
    <LiveKitRoom
      video={mediaState.videoEnabled}
      audio={mediaState.audioEnabled}
      token={token}
      connect={true}
      serverUrl={livekitUrl}
      data-lk-theme="default"
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
