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
  CheckCircle2,
  Computer,
  Gamepad2,
  Headphones,
  Info,
  Loader2,
  Lock,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneCall,
  PhoneOff,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  UserPlus,
  Volume2,
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
    return "Camera permission is blocked. Click the lock/tune icon in your browser address bar to allow camera access.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera device was found. Connect a webcam and try again.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Your camera is already in use by another app or browser tab. Close it there, then try again.";
  }

  return "Camera could not be opened. Check webcam permissions and try again.";
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
  const isSpeaking = participant?.isSpeaking;

  return (
    <div
      className={`relative h-[260px] w-full overflow-hidden rounded-2xl border bg-[#1e1f22] shadow-2xl transition-all duration-200 ${
        isSpeaking
          ? "border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/50"
          : "border-white/10"
      }`}
    >
      {hasVideo ? (
        <ParticipantTile participant={participant} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#1e1f22] p-6 text-center">
          <div className="relative">
            <UserAvatar src={imageUrl} name={displayName} className="h-20 w-20 ring-2 ring-white/10 shadow-xl" />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{isLocal ? `${displayName} (You)` : displayName}</p>
            <p className="text-[11px] text-zinc-400">
              {participant?.isMicrophoneEnabled === false ? "Muted" : isSpeaking ? "Speaking..." : "Listening..."}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
        {participant?.isMicrophoneEnabled === false ? (
          <MicOff className="h-3 w-3 text-rose-400" />
        ) : (
          <Mic className="h-3 w-3 text-emerald-400" />
        )}
        <span>{isLocal ? `${displayName} (You)` : displayName}</span>
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
            <span className="text-xs font-bold text-white">Live Call</span>
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
  const { user, isLoaded } = useUser();
  const { isExpired, extendLifespan } = useServerTemporary(serverId);

  // Pre-join Preview State
  const [hasJoined, setHasJoined] = useState(false);

  // LiveKit State
  const [token, setToken] = useState("");
  const [liveKitServerUrl, setLiveKitServerUrl] = useState("");
  const [useFallbackStudio, setUseFallbackStudio] = useState(true);
  const [isLiveKitLoading, setIsLiveKitLoading] = useState(false);
  const [liveKitError, setLiveKitError] = useState("");

  // WebRTC Local Media & Preview Streams State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(!audio);
  const [isVideoOff, setIsVideoOff] = useState(!video);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaPermissionMessage, setMediaPermissionMessage] = useState("");

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
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

  // 1. Check LiveKit Token with fallback timeout
  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id || isExpired) {
      setIsLiveKitLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

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
          credentials: "same-origin",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (!isMounted) return;

        if (!response.ok || !data.token || !data.wsUrl) {
          setToken("");
          setLiveKitServerUrl("");
          setUseFallbackStudio(true);
          setLiveKitError(data?.error || "");
          return;
        }

        setToken(data.token);
        setLiveKitServerUrl(data.wsUrl);
        setUseFallbackStudio(false);
        setLiveKitError("");
      } catch (err) {
        if (!isMounted) return;
        setToken("");
        setLiveKitServerUrl("");
        setUseFallbackStudio(true);
      } finally {
        if (isMounted) {
          setIsLiveKitLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isLoaded, user?.id, user?.fullName, user?.username, user?.primaryEmailAddress, user?.imageUrl, chatId, isExpired, getLiveKitIdentity]);

  // 2. Initialize Microphone & Live Sound Meter
  const initAudio = useCallback(async () => {
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
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
      console.log("Audio permission or device notice:", e);
    }
  }, []);

  // 3. Initialize Camera Preview
  const initCamera = useCallback(async () => {
    if (!video) return;
    try {
      const vStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setCameraStream(vStream);
      setIsVideoOff(false);
      setMediaPermissionMessage("");
    } catch (e) {
      console.log("Webcam permission notice:", e);
      setIsVideoOff(true);
      setMediaPermissionMessage(getCameraErrorMessage(e));
    }
  }, [video]);

  // Initialize preview on mount
  useEffect(() => {
    if (!isExpired) {
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
  }, [isExpired, initAudio, initCamera, video]);

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

  // Set Camera Video Refs (both preview & in-call)
  const setCameraVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
      }
      node.play().catch(() => {});
    }
  }, [cameraStream]);

  const setPreviewVideoRef = useCallback((node: HTMLVideoElement | null) => {
    previewVideoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
      }
      node.play().catch(() => {});
    }
  }, [cameraStream]);

  const setScreenVideoRef = useCallback((node: HTMLVideoElement | null) => {
    screenVideoRef.current = node;
    if (node && screenStream) {
      if (node.srcObject !== screenStream) {
        node.srcObject = screenStream;
      }
      node.play().catch(() => {});
    }
  }, [screenStream]);

  useEffect(() => {
    if (previewVideoRef.current && cameraStream) {
      previewVideoRef.current.srcObject = cameraStream;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [cameraStream, isVideoOff]);

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

  // Toggle Microphone
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
      setMediaPermissionMessage("This browser does not support webcam access.");
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
          video: { displaySurface: "monitor" } as any,
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
        console.log("Screen share was canceled:", err);
      }
    }
  };

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

  const userName = user?.fullName || user?.username || "You";

  // =========================================================================
  // 1. PRE-JOIN PREVIEW SCREEN (Camera & Mic Preview / Setup Lobby)
  // =========================================================================
  if (!hasJoined) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center bg-[#111214] text-white p-4 sm:p-6 overflow-y-auto">
        <div className="w-full max-w-2xl flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              {video ? "Video Channel Preview" : "Voice Channel Preview"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ready to jump in?
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Check your camera & microphone settings before connecting.
            </p>
          </div>

          {/* Main Preview Container */}
          <div className="relative w-full aspect-video max-h-[360px] rounded-3xl overflow-hidden bg-[#1e1f22] border border-white/10 shadow-2xl flex items-center justify-center group">
            {/* Live Camera Feed */}
            {!isVideoOff && cameraStream ? (
              <video
                ref={setPreviewVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1] bg-black"
              />
            ) : (
              /* Avatar Placeholder when Camera is Off */
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="relative">
                  <UserAvatar
                    src={user?.imageUrl}
                    name={userName}
                    className="h-24 w-24 ring-4 ring-indigo-500/30 shadow-2xl"
                  />
                  {audioLevel > 5 && !isMuted && (
                    <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-base font-bold text-white">{userName}</p>
                  <p className="text-xs text-zinc-400">
                    {isMuted ? "Microphone is muted" : "Camera is turned off"}
                  </p>
                </div>
              </div>
            )}

            {/* Top Badge: Name & Status */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white">
              <span className={`w-2 h-2 rounded-full ${!isMuted ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span>{userName}</span>
            </div>

            {/* Bottom Controls Overlay on Preview */}
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10">
              {/* Audio Volume Bar */}
              <div className="flex items-center gap-2 min-w-0">
                {!isMuted ? (
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex gap-0.5 items-end h-4 w-16 sm:w-24 bg-zinc-800/80 rounded px-1 py-0.5">
                      {[0.15, 0.35, 0.55, 0.75, 0.95].map((thresh, idx) => {
                        const active = !isMuted && audioLevel > thresh * 35;
                        return (
                          <span
                            key={idx}
                            className={`flex-1 rounded-sm transition-all duration-75 ${
                              active ? "bg-emerald-400 h-full" : "bg-zinc-600 h-1"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <VolumeX className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Mic Muted</span>
                  </div>
                )}
              </div>

              {/* Toggle Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={toggleMute}
                  className={`h-9 px-3 rounded-xl font-semibold text-xs transition gap-1.5 ${
                    isMuted
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10"
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  <span>{isMuted ? "Unmute" : "Mute"}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={toggleVideo}
                  className={`h-9 px-3 rounded-xl font-semibold text-xs transition gap-1.5 ${
                    !isVideoOff && cameraStream
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10"
                  }`}
                >
                  {!isVideoOff && cameraStream ? (
                    <Camera className="w-4 h-4 text-white" />
                  ) : (
                    <CameraOff className="w-4 h-4 text-zinc-400" />
                  )}
                  <span>{!isVideoOff && cameraStream ? "Camera On" : "Camera Off"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Device Readiness Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1e1f22]/80 border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-white">Microphone</p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {isMuted ? "Ready (Muted)" : "Active & Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1e1f22]/80 border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-white">Camera</p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {!isVideoOff && cameraStream ? "Webcam Active" : "Disabled (Optional)"}
                </p>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 p-2.5 rounded-xl bg-[#1e1f22]/80 border border-white/5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-white">Connection</p>
                <p className="text-[10px] text-zinc-400 truncate">HD Voice & Video</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Button
              type="button"
              onClick={() => setHasJoined(true)}
              className="w-full sm:flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/25 transition transform active:scale-95 flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-5 h-5" />
              <span>{video ? "Join Video Call" : "Join Voice Channel"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={navigateAway}
              className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm border border-white/5"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LIVEKIT ACTIVE CALL (When valid LiveKit token & URL exist)
  // =========================================================================
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
          setUseFallbackStudio(true);
        }}
      >
        <LiveKitCallView onHangup={navigateAway} userImageUrl={user?.imageUrl} audio={audio} video={video} />
      </LiveKitRoom>
    );
  }

  // =========================================================================
  // 3. BUILT-IN WEBRTC STUDIO (Interactive Voice & Video Conference)
  // =========================================================================
  return (
    <div className="relative flex flex-1 flex-col h-full bg-[#111214] text-white overflow-hidden select-none">
      {/* Top Banner Warning if Permission Blocked */}
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

      {/* Channel Top Header Bar */}
      <div className="h-12 px-4 bg-[#18191c] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Voice Connected / HD Audio & Video</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setHasJoined(false)}
            className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5"
            title="Preview Devices"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Device Preview</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={copyChannelUrl}
            className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
          >
            {copiedLink ? "Link Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* Main Video & Audio Conference Grid */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="grid h-full min-h-[360px] gap-4 grid-cols-1 md:grid-cols-2">
          {/* Tile 1: Local User Video / Avatar */}
          <div
            className={`relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border transition-all duration-200 ${
              audioLevel > 5 && !isMuted
                ? "border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/40"
                : "border-white/10 bg-[#1e1f22]"
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
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="relative">
                  <UserAvatar
                    src={user?.imageUrl}
                    name={userName}
                    className="h-20 w-20 ring-4 ring-white/10 shadow-2xl"
                  />
                  {audioLevel > 5 && !isMuted && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{userName} (You)</p>
                  <p className="text-[11px] text-zinc-400">
                    {isMuted ? "Muted" : audioLevel > 5 ? "Speaking..." : "Listening..."}
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Label */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              {isMuted ? <MicOff className="h-3.5 w-3.5 text-rose-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
              <span className="max-w-[160px] truncate">{userName} (You)</span>
            </div>
          </div>

          {/* Tile 2: Screen Sharing or Room Activity Lounge */}
          <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top,_rgba(49,46,129,0.5),_rgba(17,18,20,0.95))] p-6 shadow-2xl">
            {isScreenSharing && screenStream ? (
              <video
                ref={setScreenVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain bg-black rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shadow-xl">
                  <Sparkles className="h-9 w-9 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Voice & Video Room Active</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Share your screen, turn on camera, or invite other members to join this channel!
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={copyChannelUrl}
                    className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                    Invite Members
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={toggleScreenShare}
                    className="h-8 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-white/10"
                  >
                    <Computer className="h-3.5 w-3.5 mr-1.5" />
                    Share Screen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discord-Style Bottom Control Dock */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-[#1e1f22]/95 border-t border-white/10 px-4 flex items-center justify-between backdrop-blur-xl shadow-2xl">
        {/* User Info & Volume Meter */}
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <UserAvatar src={user?.imageUrl} name={userName} className="h-9 w-9 ring-1 ring-white/10 shrink-0" />
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-white truncate">{userName}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-medium">
                {isDeafened ? "Deafened" : isMuted ? "Mic Muted" : "Voice Connected"}
              </span>
            </div>
          </div>
        </div>

        {/* Center Calling Controls */}
        <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
          {/* Mute Mic */}
          <Button
            type="button"
            size="icon"
            onClick={toggleMute}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isMuted
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </Button>

          {/* Deafen Audio */}
          <Button
            type="button"
            size="icon"
            onClick={() => setIsDeafened(!isDeafened)}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isDeafened
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
            }`}
            title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </Button>

          {/* Toggle Camera */}
          <Button
            type="button"
            size="icon"
            onClick={toggleVideo}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              !isVideoOff && cameraStream
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
            }`}
            title={!isVideoOff && cameraStream ? "Turn Off Camera" : "Turn On Camera"}
          >
            {!isVideoOff && cameraStream ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            type="button"
            size="icon"
            onClick={toggleScreenShare}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isScreenSharing
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <Computer className="w-5 h-5" />
          </Button>
        </div>

        {/* Leave Call Button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
              if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
              if (audioStream) audioStream.getTracks().forEach((t) => t.stop());
              navigateAway();
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
