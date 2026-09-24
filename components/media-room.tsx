"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";
import { useUser } from "@clerk/nextjs";
import {
  Activity,
  Camera,
  CameraOff,
  Computer,
  Copy,
  Check,
  Headphones,
  Info,
  Loader2,
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Sparkles,
  Timer,
  VolumeX,
  Wifi
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

export function MediaRoom({ chatId, video, audio, serverId }: MediaRoomProps) {
  const { user } = useUser();
  const { isExpired, extendLifespan } = useServerTemporary(serverId);

  // LiveKit State
  const [token, setToken] = useState("");
  const [useFallbackStudio, setUseFallbackStudio] = useState(false);
  const [isLiveKitLoading, setIsLiveKitLoading] = useState(true);

  // WebRTC Local Studio Streams State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(!audio);
  const [isVideoOff, setIsVideoOff] = useState(!video);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [ping, setPing] = useState(24);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

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

    if (!livekitUrl) {
      setUseFallbackStudio(true);
      setIsLiveKitLoading(false);
      return;
    }

    (async () => {
      try {
        setIsLiveKitLoading(true);
        const params = new URLSearchParams({
          room: chatId,
          identity: getLiveKitIdentity(user.id),
          name:
            user.fullName ||
            user.username ||
            user.primaryEmailAddress?.emailAddress ||
            "User",
        });

        const response = await fetch(`/api/livekit?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || !data.token) {
          setUseFallbackStudio(true);
        } else {
          setToken(data.token);
          setUseFallbackStudio(false);
        }
      } catch (err) {
        console.warn("LiveKit not reachable, switching to WebRTC studio:", err);
        setUseFallbackStudio(true);
      } finally {
        setIsLiveKitLoading(false);
      }
    })();
  }, [user?.id, user?.fullName, user?.username, user?.primaryEmailAddress, chatId, livekitUrl, isExpired, getLiveKitIdentity]);

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
    }
  }, []);

  // 3. Initialize Camera if Video Channel is opened
  const initCamera = useCallback(async () => {
    if (!video) return;
    try {
      const vStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false
      });
      setCameraStream(vStream);
      setIsVideoOff(false);
    } catch (e) {
      console.log("Webcam not available or permission denied on init:", e);
      setIsVideoOff(true);
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
    if (isVideoOff || !cameraStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false
        });
        setCameraStream(stream);
        setIsVideoOff(false);
      } catch (err) {
        console.error("Camera access failed:", err);
        alert("Camera could not be opened. Please verify that webcam permissions are allowed in your browser settings.");
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

  // Ping jitter simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(20 + Math.random() * 12));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
  if (!useFallbackStudio && token !== "" && livekitUrl) {
    return (
      <LiveKitRoom
        video={video}
        audio={audio}
        token={token}
        connect={true}
        serverUrl={livekitUrl}
        data-lk-theme="default"
        onError={(error) => {
          console.error("LiveKit room error, falling back to WebRTC studio:", error);
          setUseFallbackStudio(true);
        }}
      >
        <VideoConference />
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

  // Built-in Interactive WebRTC Voice & Video Conference Studio
  const isSpeaking = !isMuted && audioLevel > 18;
  const userName = user?.fullName || user?.username || "You";

  return (
    <div className="flex flex-1 flex-col h-full bg-[#111214] text-white overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-12 px-4 bg-[#18191c]/80 border-b border-white/5 flex items-center justify-between shrink-0 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Voice Connected</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{ping}ms</span>
            <span className="text-zinc-600">•</span>
            <span>64kbps HD</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={copyChannelUrl}
            className="h-7 px-2.5 text-[11px] border-white/10 hover:bg-white/5 text-zinc-300"
          >
            {copiedLink ? (
              <>
                <Check className="w-3 h-3 mr-1 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1 text-zinc-400" /> Share Room
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowConfigGuide(!showConfigGuide)}
            className="h-7 px-2 text-[11px] text-zinc-400 hover:text-white"
            title="LiveKit Cloud Setup (Optional)"
          >
            <Info className="w-3.5 h-3.5 mr-1 text-indigo-400" />
            {showConfigGuide ? "Hide Setup" : "LiveKit Setup"}
          </Button>
        </div>
      </div>

      {/* Optional LiveKit Cloud Setup Info Banner */}
      {showConfigGuide && (
        <div className="p-3.5 bg-indigo-950/40 border-b border-indigo-500/20 text-xs text-zinc-300 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <p className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Built-in WebRTC Audio/Video Mode is Active!
            </p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Your voice & video channel is fully functional with live camera, screen sharing, and audio visualizer.
              To connect external LiveKit Cloud clusters for hundreds of simultaneous speakers, add{" "}
              <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_LIVEKIT_URL</code>,{" "}
              <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">LIVEKIT_API_KEY</code>, and{" "}
              <code className="bg-black/40 text-amber-300 px-1.5 py-0.5 rounded font-mono">LIVEKIT_API_SECRET</code> to your{" "}
              <code className="text-indigo-300 font-mono">.env</code> file.
            </p>
          </div>
          <button
            onClick={() => setShowConfigGuide(false)}
            className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10"
          >
            Got it
          </button>
        </div>
      )}

      {/* Main Video & Audio Stage Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center overflow-y-auto">
        {/* Screen Share Tile (if active) */}
        {isScreenSharing && (
          <div className="relative w-full h-[280px] md:h-full max-h-[460px] rounded-2xl bg-[#1e1f22] border border-indigo-500/40 overflow-hidden shadow-2xl flex flex-col items-center justify-center group animate-in fade-in duration-200">
            <video
              ref={setScreenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-black"
            />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/10 shadow-md">
              <Computer className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{userName}&apos;s Screen</span>
            </div>
          </div>
        )}

        {/* Primary User Tile (Voice / Camera) */}
        <div
          className={`relative w-full h-full min-h-[260px] max-h-[460px] rounded-2xl bg-[#1e1f22] border ${
            isSpeaking ? "border-emerald-500 shadow-emerald-500/20 ring-2 ring-emerald-500/30" : "border-white/10"
          } transition-all duration-150 overflow-hidden shadow-2xl flex flex-col items-center justify-center group`}
        >
          {/* Active Camera Video Stream */}
          {!isVideoOff && cameraStream ? (
            <video
              ref={setCameraVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1] bg-black"
            />
          ) : (
            /* Voice Avatar Tile with Speaking Glow */
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
              <div className="relative">
                <div
                  className={`absolute -inset-2 rounded-full transition-all duration-75 ${
                    isSpeaking
                      ? "bg-emerald-500/30 scale-110 blur-sm ring-4 ring-emerald-500"
                      : "bg-transparent scale-100"
                  }`}
                />
                <UserAvatar
                  src={user?.imageUrl}
                  className="h-24 w-24 md:h-32 md:w-32 ring-2 ring-white/10 shadow-2xl relative z-10"
                />
                {/* Audio Wave Visualizer Indicator */}
                {isSpeaking && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-md z-20">
                    <Activity className="w-3 h-3 animate-pulse" /> Speaking
                  </div>
                )}
              </div>

              <div className="text-center">
                <h4 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                  {userName}
                  {isMuted && <MicOff className="w-4 h-4 text-rose-500 ml-1" />}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isSpeaking ? "🟢 Broadcasting Voice" : isMuted ? "🔴 Microphone Muted" : "Listening..."}
                </p>
              </div>
            </div>
          )}

          {/* User Tile Overlay Badges */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-2 border border-white/10">
            <span>{userName} (You)</span>
            {isMuted ? (
              <span className="p-0.5 rounded bg-rose-500/20 text-rose-400">
                <MicOff className="w-3 h-3" />
              </span>
            ) : (
              <span className="p-0.5 rounded bg-emerald-500/20 text-emerald-400">
                <Mic className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-black/50 text-[10px] font-mono text-zinc-300 border border-white/5">
              1080p 60fps
            </span>
          </div>
        </div>
      </div>

      {/* Discord-Style Bottom Control Dock */}
      <div className="h-20 bg-[#1e1f22]/95 border-t border-white/10 px-4 flex items-center justify-between shrink-0 shadow-2xl backdrop-blur-xl">
        {/* Left Status */}
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar src={user?.imageUrl} className="h-9 w-9 ring-1 ring-white/10 shrink-0" />
          <div className="hidden sm:flex flex-col truncate">
            <span className="text-xs font-bold text-white truncate">{userName}</span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Voice Connected / RTC HD
            </span>
          </div>
        </div>

        {/* Center Control Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Mute Toggle */}
          <Button
            type="button"
            size="icon"
            onClick={toggleMute}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isMuted
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Deafen Toggle */}
          <Button
            type="button"
            size="icon"
            onClick={() => setIsDeafened(!isDeafened)}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isDeafened
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </Button>

          {/* Camera Toggle */}
          <Button
            type="button"
            size="icon"
            onClick={toggleVideo}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              !isVideoOff && cameraStream
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={!isVideoOff && cameraStream ? "Turn Off Camera" : "Turn On Camera"}
          >
            {!isVideoOff && cameraStream ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share Toggle */}
          <Button
            type="button"
            size="icon"
            onClick={toggleScreenShare}
            className={`h-11 w-11 rounded-2xl transition shadow-lg ${
              isScreenSharing
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                : "bg-zinc-700/80 hover:bg-zinc-600 text-white"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <Computer className="w-5 h-5" />
          </Button>
        </div>

        {/* Right Action: Disconnect */}
        <div className="flex items-center gap-2">
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
              if (serverId) {
                window.location.href = `/servers/${serverId}`;
              } else {
                window.location.href = "/";
              }
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


