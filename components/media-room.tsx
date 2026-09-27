"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Computer,
  Headphones,
  Info,
  Link,
  Lock,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Radio,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  UserPlus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useServerTemporary } from "@/hooks/use-server-temporary";
import { useSocket } from "@/components/providers/socket-provider";
import { useModal } from "@/hooks/use-modal-store";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
  serverId?: string;
}

interface PeerParticipant {
  socketId: string;
  user: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  mediaState: {
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
  };
  stream?: MediaStream;
  isSpeaking?: boolean;
  connectionState?: RTCPeerConnectionState;
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

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

// Remote Participant Video & Audio Tile Component
function RemoteParticipantTile({
  participant,
  isDeafened,
}: {
  participant: PeerParticipant;
  isDeafened: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const hasVideoStream = Boolean(
    participant.stream &&
    participant.stream.getVideoTracks().length > 0 &&
    participant.stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live") &&
    !participant.mediaState.isVideoOff
  );

  // Video attachment
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [participant.stream, hasVideoStream]);

  // Audio attachment and playback with resilient track change handling
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || !participant.stream) return;

    audioElement.srcObject = participant.stream;
    audioElement.muted = isDeafened;

    const playAudio = () => {
      audioElement.play().catch((err) => {
        console.log("Remote audio autoplay note:", err);
      });
    };

    playAudio();

    const handleTrackAdded = () => {
      audioElement.srcObject = null;
      audioElement.srcObject = participant.stream!;
      playAudio();
    };

    participant.stream.addEventListener("addtrack", handleTrackAdded);
    participant.stream.getAudioTracks().forEach((track) => {
      track.addEventListener("unmute", playAudio);
    });

    return () => {
      participant.stream?.removeEventListener("addtrack", handleTrackAdded);
      participant.stream?.getAudioTracks().forEach((track) => {
        track.removeEventListener("unmute", playAudio);
      });
    };
  }, [participant.stream, isDeafened]);

  // Audio visualizer for remote participant
  useEffect(() => {
    if (!participant.stream) return;
    const audioTracks = participant.stream.getAudioTracks();
    if (!audioTracks.length) return;

    let animId: number;
    let audioCtx: AudioContext | null = null;
    let isCancelled = false;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(participant.stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const check = () => {
          if (isCancelled) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setAudioLevel(sum / dataArray.length);
          animId = requestAnimationFrame(check);
        };
        check();
      }
    } catch (e) {
      console.log("Remote audio analyser error:", e);
    }

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [participant.stream]);

  const isSpeaking = audioLevel > 5 && !participant.mediaState.isMuted;
  const isConnecting = !participant.stream || participant.connectionState === "connecting";
  const statusLabel = participant.mediaState.isMuted
    ? "Muted"
    : isSpeaking
    ? "Speaking..."
    : isConnecting
    ? "Connecting..."
    : "Connected";

  return (
    <div
      className={`relative flex min-h-[260px] h-full w-full items-center justify-center overflow-hidden rounded-2xl border transition-all duration-200 ${
        isSpeaking
          ? "border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/40"
          : "border-white/10 bg-[#1e1f22]"
      }`}
    >
      {/* Hidden Remote Audio Element (Always Plays Incoming Audio) */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Video stream or Avatar */}
      {hasVideoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover bg-black"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="relative">
            <UserAvatar
              src={participant.user.imageUrl}
              name={participant.user.name}
              className="h-20 w-20 ring-4 ring-white/10 shadow-2xl"
            />
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{participant.user.name}</p>
            <p className="text-[11px] text-zinc-400">
              {statusLabel}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Info Label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
        {participant.mediaState.isMuted ? (
          <MicOff className="h-3.5 w-3.5 text-rose-400" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-emerald-400" />
        )}
        <span className="max-w-[160px] truncate">{participant.user.name}</span>
      </div>
    </div>
  );
}

export function MediaRoom({ chatId, video, audio, serverId }: MediaRoomProps) {
  const { user } = useUser();
  const { socket } = useSocket();
  const { onOpen } = useModal();
  const { isExpired, extendLifespan } = useServerTemporary(serverId);

  // Pre-join Preview State
  const [hasJoined, setHasJoined] = useState(false);

  // WebRTC Local Media & Preview Streams State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Remote WebRTC Participants Map
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, PeerParticipant>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(!audio);
  const [isVideoOff, setIsVideoOff] = useState(!video);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaPermissionMessage, setMediaPermissionMessage] = useState("");
  const currentMediaStateRef = useRef({
    isMuted: !audio,
    isVideoOff: !video,
    isScreenSharing: false,
  });

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

  const userName = user?.fullName || user?.username || "You";
  const userImageUrl = user?.imageUrl;

  useEffect(() => {
    currentMediaStateRef.current = {
      isMuted,
      isVideoOff,
      isScreenSharing,
    };
  }, [isMuted, isVideoOff, isScreenSharing]);

  useEffect(() => {
    audioStreamRef.current = audioStream;
  }, [audioStream]);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  // Combine local audio + camera tracks into a master local stream
  const getCombinedLocalStream = useCallback(() => {
    if (!localStreamRef.current) {
      localStreamRef.current = new MediaStream();
    }
    const combined = localStreamRef.current;

    // Add audio track
    const currentAudioStream = audioStreamRef.current;
    const currentCameraStream = cameraStreamRef.current;
    const currentMediaState = currentMediaStateRef.current;

    if (currentAudioStream) {
      const audioTrack = currentAudioStream.getAudioTracks()[0];
      if (audioTrack && !combined.getAudioTracks().includes(audioTrack)) {
        combined.getAudioTracks().forEach((t) => combined.removeTrack(t));
        combined.addTrack(audioTrack);
      }
    }

    // Add video track
    if (currentCameraStream && !currentMediaState.isVideoOff) {
      const videoTrack = currentCameraStream.getVideoTracks()[0];
      if (videoTrack && !combined.getVideoTracks().includes(videoTrack)) {
        combined.getVideoTracks().forEach((t) => combined.removeTrack(t));
        combined.addTrack(videoTrack);
      }
    } else if (currentMediaState.isVideoOff) {
      combined.getVideoTracks().forEach((t) => combined.removeTrack(t));
    }

    return combined;
  }, []);

  const syncAudioTrackToPeers = useCallback((stream: MediaStream | null) => {
    const audioTrack = stream?.getAudioTracks()[0] || null;

    peerConnectionsRef.current.forEach((pc) => {
      const audioSender = pc.getSenders().find((sender) => sender.track?.kind === "audio");

      if (audioSender) {
        audioSender.replaceTrack(audioTrack).catch((err) => console.error("Error replacing audio track:", err));
      } else if (audioTrack && stream) {
        pc.addTrack(audioTrack, stream);
      }
    });
  }, []);

  const syncVideoTrackToPeers = useCallback((stream: MediaStream | null) => {
    const videoTrack = stream?.getVideoTracks()[0] || null;

    peerConnectionsRef.current.forEach((pc) => {
      const videoSender = pc.getSenders().find((sender) => sender.track?.kind === "video");

      if (videoSender) {
        videoSender.replaceTrack(videoTrack).catch((err) => console.error("Error replacing video track:", err));
      } else if (videoTrack && stream) {
        pc.addTrack(videoTrack, stream);
      }
    });
  }, []);

  // 1. Initialize Microphone & Live Sound Meter
  const initAudio = useCallback(async () => {
    try {
      const aStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Match track enabled state with current mute setting
      aStream.getAudioTracks().forEach((t) => {
        t.enabled = !currentMediaStateRef.current.isMuted;
      });

      setAudioStream(aStream);
      audioStreamRef.current = aStream;
      syncAudioTrackToPeers(aStream);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
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
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setAudioLevel(sum / dataArray.length);
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }
    } catch (e) {
      console.log("Audio permission notice:", e);
    }
  }, [syncAudioTrackToPeers]);

  // 2. Initialize Camera Preview
  const initCamera = useCallback(async () => {
    if (!video) return;
    try {
      const vStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
      setCameraStream(vStream);
      cameraStreamRef.current = vStream;
      setIsVideoOff(false);
      syncVideoTrackToPeers(vStream);
      setMediaPermissionMessage("");
    } catch (e) {
      console.log("Webcam permission notice:", e);
      setIsVideoOff(true);
      setMediaPermissionMessage(getCameraErrorMessage(e));
    }
  }, [video, syncVideoTrackToPeers]);

  // Setup preview on initial load
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
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isExpired, initAudio, initCamera, video]);

  // Cleanup all media tracks on unmount
  useEffect(() => {
    const peerConnections = peerConnectionsRef.current;
    const pendingIceCandidates = pendingIceCandidatesRef.current;

    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
      if (audioStream) audioStream.getTracks().forEach((t) => t.stop());
      peerConnections.forEach((pc) => pc.close());
      peerConnections.clear();
      pendingIceCandidates.clear();
    };
  }, [cameraStream, screenStream, audioStream]);

  // Set Video Refs
  const setCameraVideoRef = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) node.srcObject = cameraStream;
      node.play().catch(() => {});
    }
  }, [cameraStream]);

  const setPreviewVideoRef = useCallback((node: HTMLVideoElement | null) => {
    previewVideoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) node.srcObject = cameraStream;
      node.play().catch(() => {});
    }
  }, [cameraStream]);

  const setScreenVideoRef = useCallback((node: HTMLVideoElement | null) => {
    screenVideoRef.current = node;
    if (node && screenStream) {
      if (node.srcObject !== screenStream) node.srcObject = screenStream;
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

  // =========================================================================
  // WebRTC Mesh Multi-Peer Connection Logic (Full Bidirectional 2-Way)
  // =========================================================================
  const createPeerConnection = useCallback((targetSocketId: string, participantUser: any, participantMedia: any, isInitiator: boolean) => {
    if (!socket) return null;

    if (peerConnectionsRef.current.has(targetSocketId)) {
      peerConnectionsRef.current.get(targetSocketId)?.close();
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionsRef.current.set(targetSocketId, pc);

    // 1. Attach local audio & video tracks directly so offerer and answerer pair cleanly without transceiver collision
    const currentAudio = audioStreamRef.current;
    const currentCamera = cameraStreamRef.current;
    const currentMediaState = currentMediaStateRef.current;

    if (currentAudio) {
      currentAudio.getAudioTracks().forEach((track) => {
        pc.addTrack(track, currentAudio);
      });
    }

    if (currentCamera && !currentMediaState.isVideoOff) {
      currentCamera.getVideoTracks().forEach((track) => {
        pc.addTrack(track, currentCamera);
      });
    }

    let isNegotiating = false;
    const sendOffer = async () => {
      if (isNegotiating || pc.signalingState !== "stable") return;

      try {
        isNegotiating = true;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        socket.emit("call:signal", {
          to: targetSocketId,
          signal: { type: "offer", sdp: pc.localDescription },
        });
      } catch (err) {
        console.error("Error creating WebRTC offer:", err);
      } finally {
        isNegotiating = false;
      }
    };

    // 2. Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call:signal", {
          to: targetSocketId,
          signal: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!isInitiator) return;
      await sendOffer();
    };

    // 4. Handle incoming remote stream tracks
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      if (event.track) {
        if (!remoteStream.getTracks().includes(event.track)) {
          remoteStream.addTrack(event.track);
        }
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!remoteStream.getTracks().includes(track)) {
            remoteStream.addTrack(track);
          }
        });
      }

      // Create new MediaStream reference so React detects state change
      const newStream = new MediaStream(remoteStream.getTracks());

      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId) || {
          socketId: targetSocketId,
          user: participantUser,
          mediaState: participantMedia,
        };
        next.set(targetSocketId, { ...existing, stream: newStream });
        return next;
      });
    };

    // 5. Handle Negotiation / Disconnection
    pc.onconnectionstatechange = () => {
      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId) || {
          socketId: targetSocketId,
          user: participantUser,
          mediaState: participantMedia,
        };

        next.set(targetSocketId, {
          ...existing,
          connectionState: pc.connectionState,
        });

        return next;
      });

      if (pc.connectionState === "closed") {
        peerConnectionsRef.current.delete(targetSocketId);
      }
    };

    // If initiator (newcomer to existing members), create SDP Offer
    if (isInitiator) {
      void sendOffer();
    }

    return pc;
  }, [socket, getCombinedLocalStream]);

  // Connect to the room when user clicks "Join"
  useEffect(() => {
    if (!hasJoined || !socket || !user?.id) return;

    const currentMediaState = currentMediaStateRef.current;

    // 1. Existing participants received upon joining
    const handleAllParticipants = (participants: Array<{ socketId: string; user: any; mediaState: any }>) => {
      participants.forEach((p) => {
        setRemoteParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(p.socketId);
          next.set(p.socketId, {
            ...existing,
            socketId: p.socketId,
            user: p.user,
            mediaState: p.mediaState,
          });
          return next;
        });

        // Initiate WebRTC connection to existing participant
        createPeerConnection(p.socketId, p.user, p.mediaState, true);
      });
    };

    // 2. New user joined after us
    const handleUserJoined = (data: { socketId: string; user: any; mediaState: any }) => {
      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.socketId);
        next.set(data.socketId, {
          ...existing,
          socketId: data.socketId,
          user: data.user,
          mediaState: data.mediaState,
        });
        return next;
      });
    };

    // 3. Handle WebRTC signals (Offers, Answers, ICE Candidates)
    const handleSignal = async (data: { from: string; signal: any; user: any; mediaState: any }) => {
      const { from, signal, user: senderUser, mediaState: senderMedia } = data;
      let pc = peerConnectionsRef.current.get(from);

      const flushPendingCandidates = async (connection: RTCPeerConnection) => {
        const queued = pendingIceCandidatesRef.current.get(from) || [];
        pendingIceCandidatesRef.current.delete(from);

        for (const candidate of queued) {
          try {
            await connection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Error adding queued ICE candidate:", e);
          }
        }
      };

      if (signal.type === "offer") {
        if (!pc) {
          pc = createPeerConnection(from, senderUser, senderMedia, false)!;
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("call:signal", {
            to: from,
            signal: { type: "answer", sdp: pc.localDescription },
          });
        } catch (e) {
          console.error("Error handling WebRTC offer:", e);
        }
      } else if (signal.type === "answer") {
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            await flushPendingCandidates(pc);
          } catch (e) {
            console.error("Error setting remote answer:", e);
          }
        }
      } else if (signal.type === "candidate") {
        if (pc) {
          if (!pc.remoteDescription) {
            const queued = pendingIceCandidatesRef.current.get(from) || [];
            queued.push(signal.candidate);
            pendingIceCandidatesRef.current.set(from, queued);
            return;
          }

          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        } else {
          const queued = pendingIceCandidatesRef.current.get(from) || [];
          queued.push(signal.candidate);
          pendingIceCandidatesRef.current.set(from, queued);
        }
      }
    };

    // 4. Remote participant updated their media state (Mute / Camera)
    const handleUserMediaState = (data: { socketId: string; mediaState: any }) => {
      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.socketId);
        if (existing) {
          next.set(data.socketId, { ...existing, mediaState: data.mediaState });
        }
        return next;
      });
    };

    // 5. Participant left
    const handleUserLeft = (data: { socketId: string }) => {
      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
      const pc = peerConnectionsRef.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(data.socketId);
      }
      pendingIceCandidatesRef.current.delete(data.socketId);
    };

    socket.on("call:all_participants", handleAllParticipants);
    socket.on("call:user_joined", handleUserJoined);
    socket.on("call:signal", handleSignal);
    socket.on("call:user_media_state", handleUserMediaState);
    socket.on("call:user_left", handleUserLeft);

    // Join only after listeners are active; the server replies immediately.
    socket.emit("call:join_room", {
      roomId: chatId,
      user: {
        id: user?.id,
        name: userName,
        imageUrl: userImageUrl,
      },
      mediaState: currentMediaState,
    });

    return () => {
      socket.off("call:all_participants", handleAllParticipants);
      socket.off("call:user_joined", handleUserJoined);
      socket.off("call:signal", handleSignal);
      socket.off("call:user_media_state", handleUserMediaState);
      socket.off("call:user_left", handleUserLeft);
      socket.emit("call:leave_room", { roomId: chatId });
    };
  }, [hasJoined, socket, user?.id, userName, userImageUrl, chatId, createPeerConnection]);

  // Update peers when our media state changes
  const broadcastMediaState = useCallback((newMuted: boolean, newVideoOff: boolean, newScreenSharing: boolean) => {
    if (socket && hasJoined) {
      socket.emit("call:media_state", {
        roomId: chatId,
        mediaState: {
          isMuted: newMuted,
          isVideoOff: newVideoOff,
          isScreenSharing: newScreenSharing,
        },
      });
    }
  }, [socket, hasJoined, chatId]);

  // Toggle Microphone
  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    }
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    }
    setIsMuted(nextMuted);
    broadcastMediaState(nextMuted, isVideoOff, isScreenSharing);
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
        cameraStreamRef.current = stream;
        setIsVideoOff(false);
        setMediaPermissionMessage("");

        syncVideoTrackToPeers(stream);

        broadcastMediaState(isMuted, false, isScreenSharing);
      } catch (err) {
        console.error("Camera access failed:", err);
        setMediaPermissionMessage(getCameraErrorMessage(err));
      }
    } else {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      cameraStreamRef.current = null;
      setIsVideoOff(true);

      syncVideoTrackToPeers(null);

      broadcastMediaState(isMuted, true, isScreenSharing);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing && screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      broadcastMediaState(isMuted, isVideoOff, false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" } as any,
          audio: false,
        });

        setScreenStream(stream);
        setIsScreenSharing(true);
        broadcastMediaState(isMuted, isVideoOff, true);

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setScreenStream(null);
            setIsScreenSharing(false);
            broadcastMediaState(isMuted, isVideoOff, false);
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
  // 2. IN-CALL MULTI-PEER VOICE & VIDEO STUDIO (Bidirectional WebRTC)
  // =========================================================================
  const remoteList = Array.from(remoteParticipants.values());
  const totalCallers = 1 + remoteList.length;

  return (
    <div className="relative flex flex-1 flex-col h-full bg-[#111214] text-white overflow-hidden select-none">
      {/* Top Warning Banner if Permissions Blocked */}
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

      {/* Top Header Bar */}
      <div className="h-12 px-4 bg-[#18191c] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Voice Connected • {totalCallers} {totalCallers === 1 ? "Person" : "People"} in Call
          </span>
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

      {/* Main Multi-Participant Grid */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div
          className={`grid h-full min-h-[360px] gap-4 ${
            totalCallers === 1
              ? "grid-cols-1 md:grid-cols-2"
              : totalCallers === 2
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
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

          {/* Remote Participants Tiles (Real 2-Way Connected Users!) */}
          {remoteList.map((participant) => (
            <RemoteParticipantTile
              key={participant.socketId}
              participant={participant}
              isDeafened={isDeafened}
            />
          ))}

          {/* If alone in the call, show Screen Share / Waiting Lounge */}
          {remoteList.length === 0 && (
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
                      You are in the room. When other members join, their 2-way audio and video will connect automatically!
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (serverId) {
                          onOpen("invite", { serverId });
                        } else {
                          copyChannelUrl();
                        }
                      }}
                      className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Invite Members
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={copyChannelUrl}
                      className="h-8 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-white/10 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Link className="h-3.5 w-3.5" />
                      {copiedLink ? "Link Copied!" : "Copy Room Link"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={toggleScreenShare}
                      className="h-8 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-white/10 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Computer className="h-3.5 w-3.5" />
                      Share Screen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
              if (socket) {
                socket.emit("call:cancel", { conversationId: chatId });
              }
              if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
              if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
              if (audioStream) audioStream.getTracks().forEach((t) => t.stop());
              peerConnectionsRef.current.forEach((pc) => pc.close());
              peerConnectionsRef.current.clear();
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
