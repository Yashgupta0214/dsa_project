import React from "react";
import { MessageSquare, Shield, Sparkles, Video, Volume2, Zap } from "lucide-react";

export default function AuthLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row items-center justify-center bg-[#0d0e12] overflow-x-hidden">
      {/* Dynamic Ambient Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Subtle Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]"
        style={{
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)"
        }}
      />

      {/* Left Feature Showcase Banner (on larger screens) */}
      <div className="relative z-10 hidden lg:flex flex-col justify-center max-w-lg px-12 py-8 text-white space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wide uppercase w-fit backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
          Next-Gen Community Platform
        </div>

        <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
          Where communities{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            connect & belong
          </span>
        </h1>

        <p className="text-zinc-400 text-base leading-relaxed">
          Create servers, chat with markdown & custom emojis, hop into low-latency voice channels, and share your screen in crisp HD.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Real-Time</p>
              <p className="text-xs text-zinc-500">Live Socket.io</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Voice Rooms</p>
              <p className="text-xs text-zinc-500">LiveKit Audio</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Video Calls</p>
              <p className="text-xs text-zinc-500">Screen Sharing</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Enterprise Auth</p>
              <p className="text-xs text-zinc-500">Clerk Security</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Card Container */}
      <div className="relative z-10 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl backdrop-blur-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
