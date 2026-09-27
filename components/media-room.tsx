"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, Track, createLocalAudioTrack } from "livekit-client";
import { useUser } from "@clerk/nextjs";
import {
  Camera,
  CameraOff,
  Computer,
  Gamepad2,
  Headphones,
  Info,
  Loader2,
  Lock,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  Sparkles,
  Timer,
  UserPlus,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useServerTemporary } from "@/hooks/use-server-temporary";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
  serverId?: string;
}

const cameraConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user",
  },
  audio: false,
};

function getCameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission is blocked for this site. Allow camera access in the browser and try again.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera device was found. Connect a webcam and try again.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera is already in use by another app or browser tab. Close it there, then try again.";
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "The camera could not use the requested quality. Trying again should use a compatible webcam mode.";
  }

  return "Camera could not be opened. Please check webcam permissions and try again.";
}

function parseParticipantMetadata(metadata?: string | null) {
  if (!metadata) return {} as { imageUrl?: string };

  try {
    return JSON.parse(metadata) as { imageUrl?: string };
  } catch {
    return {} as { imageUrl?: string };
  }
}

function CallParticipantTile({ participant, isLocal = false }: { participant: any; isLocal?: boolean }) {
  const metadata = useMemo(
    () => parseParticipantMetadata(participant?.metadata),
    [participant?.metadata]
  );

  const imageUrl = metadata.imageUrl || participant?.name || participant?.identity || undefined;
  const displayName = participant?.name || participant?.identity || "Participant";
  const hasVideo = Boolean(participant?.videoTrackPublications && participant.videoTrackPublications.size > 0);

  return (
    <div className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1e1f22] shadow-2xl">
      {hasVideo ? (
        <ParticipantTile participant={participant} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#1e1f22] p-6 text-center">
          <UserAvatar src={imageUrl} className="h-20 w-20 ring-2 ring-white/10 shadow-xl" />
          <div>
            <p className="text-sm font-bold text-white">{isLocal ? `${displayName} (You)` : displayName}</p>
            <p className="text-[11px] text-zinc-400">{participant?.isMicrophoneEnabled === false ? "Muted" : "Listening..."}</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {isLocal ? `${displayName} (You)` : displayName}
      </div>
    </div>
  );
}

function LiveKitCallView({
  onHangup,
  userImageUrl,
  audio,
  video,
}: {
  onHangup: () => void;
  userImageUrl?: string;
  audio: boolean;
  video: boolean;
}) {
  const participants = useParticipants();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const room = useRoomContext();
  const connectionState = useConnectionState(room);
  const [isDeafened, setIsDeafened] = useState(false);
  const [controlError, setControlError] = useState("");
  const requestedInitialMediaRef = useRef(false);
  const localAudioPublication = localParticipant?.getTrack?.(Track.Source.Microphone);
  const isPublishingMicrophone = Boolean(
    localAudioPublication &&
    !localAudioPublication.isMuted &&
    localAudioPublication.isUpstreamPaused !== true
  );

  const visibleParticipants = useMemo(() => {
    const participantMap = new Map<string, { participant: any; isLocal: boolean }>();

    participants.forEach((participant) => {
      const key = participant.identity || participant.sid;
      participantMap.set(key, {
        participant,
        isLocal: participant.identity === localParticipant?.identity,
      });
    });

    if (localParticipant) {
      const key = localParticipant.identity || localParticipant.sid;
      participantMap.set(key, {
        participant: localParticipant,
        isLocal: true,
      });
    }

    return Array.from(participantMap.values());
  }, [participants, localParticipant]);

  const handleHangup = useCallback(async () => {
    if (room) {
      await room.disconnect();
    }
    onHangup();
  }, [room, onHangup]);

  const runParticipantAction = useCallback(async (action: () => Promise<unknown>, message: string) => {
    try {
      setControlError("");
      await action();
    } catch (error) {
      console.error(message, error);
      setControlError(message);
    }
  }, []);

  const publishMicrophone = useCallback(async () => {
    if (!localParticipant) return;

    const audioOptions = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    const existingPublication = localParticipant.getTrack(Track.Source.Microphone);
    if (existingPublication?.track) {
      await existingPublication.unmute();

      if (existingPublication.isUpstreamPaused) {
        await existingPublication.resumeUpstream();
      }

      if (!existingPublication.isMuted && existingPublication.isUpstreamPaused !== true) {
        return;
      }

      await localParticipant.unpublishTrack(existingPublication.track, true);
    }

    const audioTrack = await createLocalAudioTrack(audioOptions);
    const publication = await localParticipant.publishTrack(audioTrack, {
      source: Track.Source.Microphone,
      name: "microphone",
    });

    if (publication.isMuted || publication.isUpstreamPaused) {
      throw new Error("Microphone track was published but is not sending audio.");
    }
  }, [localParticipant]);

  useEffect(() => {
    if (
      !localParticipant ||
      connectionState !== ConnectionState.Connected ||
      requestedInitialMediaRef.current
    ) {
      return;
    }

    requestedInitialMediaRef.current = true;

    runParticipantAction(async () => {
      if (audio) {
        await publishMicrophone();
      }

      if (video) {
        await localParticipant.setCameraEnabled(true);
      }
    }, "Microphone or camera permission is blocked. Check browser permissions and try again.");
  }, [localParticipant, connectionState, audio, video, publishMicrophone, runParticipantAction]);

  const toggleMicrophone = useCallback(() => {
    if (!localParticipant) return;
    runParticipantAction(
      () => isPublishingMicrophone ? localParticipant.setMicrophoneEnabled(false) : publishMicrophone(),
      "Microphone permission is blocked. Check your browser permissions and try again."
    );
  }, [localParticipant, isPublishingMicrophone, publishMicrophone, runParticipantAction]);

  const toggleCamera = useCallback(() => {
    if (!localParticipant) return;
    runParticipantAction(
      () => localParticipant.setCameraEnabled(!isCameraEnabled),
      "Camera permission is blocked. Check your browser permissions and try again."
    );
  }, [localParticipant, isCameraEnabled, runParticipantAction]);

  const toggleScreenShare = useCallback(() => {
    if (!localParticipant) return;
    runParticipantAction(
      () => localParticipant.setScreenShareEnabled(!isScreenShareEnabled),
      "Screen sharing could not start. Check browser permissions and try again."
    );
  }, [localParticipant, isScreenShareEnabled, runParticipantAction]);

  return (
    <div className="flex h-full flex-1 flex-col bg-[#111214] text-white">
      {!isDeafened && <RoomAudioRenderer />}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid h-full gap-4 md:grid-cols-2">
          {visibleParticipants.map(({ participant, isLocal }) => (
            <CallParticipantTile key={participant.sid || participant.identity} participant={participant} isLocal={isLocal} />
          ))}
        </div>
      </div>

      {controlError && (
        <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
          {controlError}
        </div>
      )}

      <div className="flex h-20 items-center justify-between border-t border-white/10 bg-[#1e1f22]/95 px-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <UserAvatar src={userImageUrl} className="h-9 w-9 ring-1 ring-white/10 shrink-0" />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-white">Live call</span>
            <span className="text-[11px] text-emerald-400">
              {isDeafened ? "Deafened" : isPublishingMicrophone ? "Mic live" : isMicrophoneEnabled ? "Connecting mic" : "Muted"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="icon"
            onClick={toggleMicrophone}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isPublishingMicrophone
                ? "bg-zinc-700/80 hover:bg-zinc-600 text-white"
                : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
            }`}
            title={isPublishingMicrophone ? "Mute Mic" : "Unmute Mic"}
          >
            {isPublishingMicrophone ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={() => setIsDeafened((current) => !current)}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isDeafened
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={toggleCamera}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isCameraEnabled
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isCameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          {video && (
            <Button
              type="button"
              size="icon"
              onClick={toggleScreenShare}
              className={`h-11 w-11 rounded-2xl transition shadow-lg ${
                isScreenShareEnabled
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                  : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
              }`}
              title={isScreenShareEnabled ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Computer className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleHangup}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MediaRoom({ chatId, video, audio, serverId }: MediaRoomProps) {
  const { user } = useUser();
  const { isExpired, extendLifespan } = useServerTemporary(serverId);

  // LiveKit State
  const [token, setToken] = useState("");
  const [liveKitServerUrl, setLiveKitServerUrl] = useState("");
  const [useFallbackStudio, setUseFallbackStudio] = useState(false);
  const [isLiveKitLoading, setIsLiveKitLoading] = useState(true);
  const [liveKitError, setLiveKitError] = useState("");

  // WebRTC Local Studio Streams State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(!audio);
  const [isVideoOff, setIsVideoOff] = useState(!video);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [, setAudioLevel] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaPermissionMessage, setMediaPermissionMessage] = useState("");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const navigateAway = useCallback(() => {
    if (typeof window === "undefined") return;
    window.location.href = serverId ? `/servers/${serverId}` : "/";
  }, [serverId]);

  const getLiveKitIdentity = useCallback((userId: string) => {
    const randomPart =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${userId}-${randomPart}`;
  }, []);

  // 1. Fetch LiveKit Token if configured
  useEffect(() => {
    if (!user?.id || isExpired) return;

    (async () => {
      try {
        setIsLiveKitLoading(true);
        setLiveKitError("");
        const params = new URLSearchParams({
          room: chatId,
          identity: getLiveKitIdentity(user.id),
          name:
            user.fullName ||
            user.username ||
            user.primaryEmailAddress?.emailAddress ||
            "User",
          image: user.imageUrl || "",
        });

        const response = await fetch(`/api/livekit?${params.toString()}`, {
          credentials: "same-origin"
        });
        const data = await response.json();

        if (!response.ok || !data.token || !data.wsUrl) {
          setToken("");
          setLiveKitServerUrl("");
          setUseFallbackStudio(true);
          setLiveKitError(
            data?.error ||
              "LiveKit could not create a voice connection. Falling back to the local Discord-style preview."
          );
          return;
        }

        setToken(data.token);
        setLiveKitServerUrl(data.wsUrl);
        setUseFallbackStudio(false);
        setLiveKitError("");
      } catch (err) {
        console.warn("LiveKit token request failed:", err);
        setToken("");
        setLiveKitServerUrl("");
        setUseFallbackStudio(true);
        setLiveKitError("LiveKit is not reachable from this app right now. Using the local preview instead.");
      } finally {
        setIsLiveKitLoading(false);
      }
    })();
  }, [user?.id, user?.fullName, user?.username, user?.primaryEmailAddress, user?.imageUrl, chatId, isExpired, getLiveKitIdentity]);

  // 2. Initialize Microphone for Audio Meter Visualizer
  const initAudio = useCallback(async () => {
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(aStream);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(aStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(avg);
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (e) {
      console.log("Audio permission or device not available on init:", e);
      setMediaPermissionMessage("Microphone access is blocked. Please allow microphone permission for this site and refresh the page.");
    }
  }, []);

  // 3. Initialize Camera if Video Channel is opened
  const initCamera = useCallback(async () => {
    if (!video) return;
    try {
      const vStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setCameraStream(vStream);
      setIsVideoOff(false);
      setMediaPermissionMessage("");
    } catch (e) {
      console.log("Webcam not available or permission denied on init:", e);
      setIsVideoOff(true);
      setMediaPermissionMessage(getCameraErrorMessage(e));
    }
  }, [video]);

  useEffect(() => {
    if (useFallbackStudio && !isExpired) {
      initAudio();
      if (video) {
        initCamera();
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [useFallbackStudio, isExpired, initAudio, initCamera, video]);

  // Cleanup all media tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream, screenStream, audioStream]);

  // Attach Camera Stream whenever video element mounts or cameraStream updates
  const setCameraVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
      }
      node.play().catch((err) => console.log("Camera autoplay notice:", err));
    }
  }, [cameraStream]);

  // Attach Screen Stream whenever screen share video element mounts
  const setScreenVideoRef = useCallback((node: HTMLVideoElement | null) => {
    screenVideoRef.current = node;
    if (node && screenStream) {
      if (node.srcObject !== screenStream) {
        node.srcObject = screenStream;
      }
      node.play().catch((err) => console.log("Screen share autoplay notice:", err));
    }
  }, [screenStream]);

  // Re-sync video nodes on stream changes
  useEffect(() => {
    if (localVideoRef.current && cameraStream) {
      localVideoRef.current.srcObject = cameraStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [cameraStream, isVideoOff]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(() => {});
    }
  }, [screenStream, isScreenSharing]);

  // Toggle Microphone Mute
  const toggleMute = () => {
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = isMuted));
    }
    setIsMuted(!isMuted);
  };

  // Toggle Camera
  const toggleVideo = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaPermissionMessage("This browser does not support webcam access. Please use a modern browser with camera permissions enabled.");
      return;
    }

    if (isVideoOff || !cameraStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
        setCameraStream(stream);
        setIsVideoOff(false);
        setMediaPermissionMessage("");
      } catch (err) {
        console.error("Camera access failed:", err);
        setMediaPermissionMessage(getCameraErrorMessage(err));
      }
    } else {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setIsVideoOff(true);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing && screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor"
          } as any,
          audio: false
        });

        setScreenStream(stream);
        setIsScreenSharing(true);

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setScreenStream(null);
            setIsScreenSharing(false);
          };
        }
      } catch (err) {
        console.log("Screen share was canceled or failed:", err);
      }
    }
  };

  // Copy Channel Link
  const copyChannelUrl = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Expired Server Lock screen
  if (isExpired) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#111214] p-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-center mb-3 text-rose-500">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white">Voice & Video Calls Disabled</h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            This temporary server has expired. All voice and video calling features are locked until the lifespan is extended.
          </p>
          <Button
            onClick={() => extendLifespan(1)}
            className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs h-9 px-5 rounded-xl shadow-md shadow-amber-500/20"
          >
            <Timer className="w-4 h-4 mr-1.5" /> Extend Server Lifespan (+1 Day)
          </Button>
        </div>
      </div>
    );
  }

  // LiveKit Room Active
  if (!useFallbackStudio && token !== "" && liveKitServerUrl) {
    return (
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        connect={true}
        serverUrl={liveKitServerUrl}
        data-lk-theme="default"
        onError={(error) => {
          console.error("LiveKit room error:", error);
          setLiveKitError("LiveKit rejected the connection. Check that the URL, API key, and API secret all belong to the same LiveKit project.");
          setUseFallbackStudio(true);
        }}
      >
        <LiveKitCallView onHangup={navigateAway} userImageUrl={user?.imageUrl} audio={audio} video={video} />
      </LiveKitRoom>
    );
  }

  // Loading LiveKit
  if (isLiveKitLoading) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center bg-[#111214]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin my-4" />
        <p className="text-xs font-semibold text-zinc-400">Connecting to channel audio & video...</p>
      </div>
    );
  }

  if (liveKitError && !useFallbackStudio) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#111214] p-6 text-center">
        <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex justify-center mb-3 text-indigo-400">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Voice Room Not Connected</h3>
          <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
            {liveKitError}
          </p>
          <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
            The local preview cannot connect two devices together. Add valid{" "}
            <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_LIVEKIT_URL</code>,{" "}
            <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">LIVEKIT_API_KEY</code>, and{" "}
            <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">LIVEKIT_API_SECRET</code>, then restart{" "}
            <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">npm run dev</code>.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md shadow-indigo-500/20"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // Built-in Interactive WebRTC Voice & Video Conference Studio
  const userName = user?.fullName || user?.username || "You";

  return (
    <div className="relative flex flex-1 flex-col h-full bg-[#111214] text-white overflow-hidden select-none">
      {mediaPermissionMessage && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>{mediaPermissionMessage}</span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => window.location.reload()}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-[11px] h-8 px-3 rounded-lg"
            >
              Refresh
            </Button>
          </div>
        </div>
      )}
      <div className="h-10 px-1.5 bg-black flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <VolumeX className="h-4 w-4 text-zinc-500" />
          <span>General</span>
        </div>
        <button
          type="button"
          onClick={copyChannelUrl}
          className="h-7 rounded-md px-2 text-[11px] font-semibold text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          title="Copy room link"
        >
          {copiedLink ? "Copied" : ""}
        </button>
      </div>
      <div className="flex-1 bg-black px-0 pb-24 pt-[126px]">
        <div className="grid h-full min-h-[360px] gap-1 md:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)]">
          <div
            className={`relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[4px] ${
              !isVideoOff && cameraStream ? "bg-black" : "bg-[#ef3f43]"
            }`}
          >
            {!isVideoOff && cameraStream ? (
              <video
                ref={setCameraVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1] bg-black"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gamepad2 className="h-8 w-8 fill-white stroke-white" />
              </div>
            )}

            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-black/35 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              <span className="max-w-[160px] truncate">{userName}</span>
            </div>

            <button
              type="button"
              className="absolute bottom-2 right-2 flex h-5 w-7 items-center justify-center rounded bg-black/35 text-white backdrop-blur-sm hover:bg-black/55"
              title="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-[4px] bg-[radial-gradient(circle_at_center,_rgba(74,21,85,0.72),_rgba(9,0,8,0.98)_60%)]">
            {isScreenSharing ? (
              <video
                ref={setScreenVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain bg-black"
              />
            ) : (
              <div className="flex flex-col items-center gap-5 text-center">
                <div className="relative flex h-28 w-36 items-center justify-center">
                  <div className="absolute left-2 top-8 h-12 w-20 -rotate-12 rounded-full bg-[#ff3fb4] shadow-[inset_0_-8px_0_rgba(0,0,0,0.16)]" />
                  <div className="absolute left-8 top-3 h-14 w-14 rounded-xl border-4 border-[#9ea2ff] bg-[#6c5cff] shadow-[0_10px_0_rgba(36,20,90,0.7)]">
                    <Sparkles className="m-auto mt-3 h-6 w-6 fill-[#b848ff] text-[#b848ff]" />
                  </div>
                  <div className="absolute right-6 top-10 h-10 w-10 rotate-45 bg-[#43d28b] shadow-[0_8px_0_rgba(0,0,0,0.2)]" />
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex h-7 items-center gap-1.5 rounded bg-[#27282c] px-3 text-[11px] font-bold text-white shadow hover:bg-[#303136]">
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite to Voice
                  </button>
                  <button className="inline-flex h-7 items-center gap-1.5 rounded bg-[#27282c] px-3 text-[11px] font-bold text-white shadow hover:bg-[#303136]">
                    <Gamepad2 className="h-3.5 w-3.5" />
                    Choose Activity
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Discord-Style Bottom Control Dock */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-black/95 px-4 flex items-center justify-center shrink-0">
        <div className="absolute bottom-5 left-1.5 hidden items-center gap-3 min-w-0">
          <UserAvatar src={user?.imageUrl} className="h-9 w-9 ring-1 ring-white/10 shrink-0" />
          <div className="hidden sm:flex flex-col truncate">
            <span className="text-xs font-bold text-white truncate">{userName}</span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Voice Connected / RTC HD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            size="icon"
            onClick={toggleMute}
            className={`h-9 w-11 rounded-lg border border-white/10 transition shadow-lg ${
              isMuted
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={() => setIsDeafened(!isDeafened)}
            className={`h-9 w-11 rounded-lg border border-white/10 transition shadow-lg ${
              isDeafened
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={toggleVideo}
            className={`h-9 w-11 rounded-lg border border-white/10 transition shadow-lg ${
              !isVideoOff && cameraStream
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={!isVideoOff && cameraStream ? "Turn Off Camera" : "Turn On Camera"}
          >
            {!isVideoOff && cameraStream ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={toggleScreenShare}
            className={`h-9 w-11 rounded-lg border border-white/10 transition shadow-lg ${
              isScreenSharing
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <Computer className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2 ml-1">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (cameraStream) {
                cameraStream.getTracks().forEach((t) => t.stop());
              }
              if (screenStream) {
                screenStream.getTracks().forEach((t) => t.stop());
              }
              if (audioStream) {
                audioStream.getTracks().forEach((t) => t.stop());
              }
              navigateAway();
            }}
            className="bg-[#f23f42] hover:bg-[#d83c3e] text-white font-bold text-xs h-9 w-11 rounded-lg shadow-lg shadow-rose-600/20 flex items-center justify-center"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


