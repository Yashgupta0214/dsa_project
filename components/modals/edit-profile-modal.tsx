"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Moon,
  RotateCcw,
  Sparkles,
  Upload,
  User,
  X
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";

// Curated high quality avatar presets
const AVATAR_PRESETS = [
  {
    id: "cyber-cat",
    name: "Cyber Cat",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "neon-gamer",
    name: "Neon Gamer",
    url: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "anime-vibes",
    name: "Aesthetic",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "galaxy-bot",
    name: "Cosmic",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "retro-pixel",
    name: "Stylist",
    url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "synth-wave",
    name: "Minimal",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80"
  }
];

const BANNER_THEMES = [
  { id: "nebula", name: "Midnight Nebula", gradient: "from-indigo-600 via-purple-600 to-pink-500" },
  { id: "sunset", name: "Sunset Blaze", gradient: "from-amber-500 via-rose-500 to-purple-600" },
  { id: "emerald", name: "Cyber Emerald", gradient: "from-emerald-500 via-teal-600 to-cyan-600" },
  { id: "ocean", name: "Deep Ocean", gradient: "from-blue-600 via-indigo-600 to-violet-800" },
  { id: "monochrome", name: "Dark Velvet", gradient: "from-zinc-800 via-zinc-900 to-black" }
];

const STATUS_PRESETS = [
  "💻 Coding something cool",
  "🎮 In Game / AFK",
  "🎧 Listening to music",
  "☕ Taking a coffee break",
  "🚀 Launching new features",
  "📚 Studying / Focus Mode"
];

export function EditProfileModal() {
  const { isOpen, onClose, onOpen, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "editProfile";
  const { profile } = data;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"online" | "idle" | "dnd" | "invisible">("online");
  const [customStatus, setCustomStatus] = useState("");
  const [bannerTheme, setBannerTheme] = useState("nebula");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setImageUrl(profile.imageUrl || "");
    }
    const savedStatus = localStorage.getItem("user_custom_status");
    if (savedStatus) setCustomStatus(savedStatus);
    const savedPresence = localStorage.getItem("user_presence_status") as any;
    if (savedPresence) setStatus(savedPresence || "online");
    const savedTheme = localStorage.getItem("user_banner_theme");
    if (savedTheme) setBannerTheme(savedTheme);
  }, [profile, isModalOpen]);

  const handleClose = () => {
    setError("");
    setIsLoading(false);
    setIsUploading(false);
    setShowUrlInput(false);
    onClose();
  };

  const openFullSettings = () => {
    onClose();
    setTimeout(() => {
      onOpen("userSettings", { profile });
    }, 100);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (file?: File) => {
    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      // 1. Optimistic Preview
      const dataUrl = await readFileAsDataUrl(file);
      setImageUrl(dataUrl);

      // 2. Upload to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("endpoint", "serverImage");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setImageUrl(data.url);
        }
      } else {
        // Even if server upload has temporary issue, dataUrl preview is preserved
        console.warn("Server upload fallback: using local data URL");
      }
    } catch (err: any) {
      console.warn("Upload fallback activated:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUrlSubmit = () => {
    if (customUrlInput.trim()) {
      setImageUrl(customUrlInput.trim());
      setCustomUrlInput("");
      setShowUrlInput(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      await axios.patch("/api/profile", {
        name: name.trim(),
        imageUrl: imageUrl || undefined
      });

      localStorage.setItem("user_custom_status", customStatus.trim());
      localStorage.setItem("user_presence_status", status);
      localStorage.setItem("user_banner_theme", bannerTheme);
      window.dispatchEvent(new Event("user_status_changed"));

      handleClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data || "Failed to update profile.");
      setIsLoading(false);
    }
  };

  const activeBanner =
    BANNER_THEMES.find((t) => t.id === bannerTheme)?.gradient ||
    "from-indigo-600 via-purple-600 to-pink-500";

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="pt-6 px-6 pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <DialogTitle className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Customize Profile
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Set your avatar, display name, banner, and online status.
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openFullSettings}
              className="text-xs h-8 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1.5 rounded-lg"
            >
              <Bell className="h-3.5 w-3.5" />
              Settings
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
          {/* PROFILE LIVE PREVIEW CARD */}
          <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-md bg-zinc-50 dark:bg-[#2b2d31]/50">
            {/* Banner */}
            <div className={`h-24 w-full bg-gradient-to-r ${activeBanner} relative flex items-end justify-end p-2 transition-all duration-300`}>
              <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-medium">
                <span>Theme:</span>
                <span className="font-bold uppercase tracking-wider">{bannerTheme}</span>
              </div>
            </div>

            {/* Profile Avatar & Info Overlay */}
            <div className="p-4 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
              {/* Interactive Avatar */}
              <div className="relative -mt-12 group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileUpload(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-20 w-20 rounded-full ring-4 ring-white dark:ring-[#1e1f22] overflow-hidden cursor-pointer shadow-xl transition-all duration-200 group-hover:scale-105 ${
                    isDragging ? "ring-indigo-500 scale-105" : ""
                  }`}
                  title="Click or drag image to upload avatar"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                      {name ? name.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}

                  {/* Hover Camera Overlay */}
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        <span className="text-[9px] font-semibold mt-0.5">Change</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Indicator Dot */}
                <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full ring-2 ring-white dark:ring-[#1e1f22] flex items-center justify-center">
                  {status === "online" && (
                    <span className="h-full w-full rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  )}
                  {status === "idle" && (
                    <span className="h-full w-full rounded-full bg-amber-400 flex items-center justify-center text-[9px] font-bold text-zinc-900">
                      🌙
                    </span>
                  )}
                  {status === "dnd" && (
                    <span className="h-full w-full rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                  )}
                  {status === "invisible" && (
                    <span className="h-full w-full rounded-full bg-zinc-500 ring-1 ring-zinc-400" />
                  )}
                </div>
              </div>

              {/* Action Buttons for Avatar */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="h-7 text-xs rounded-lg gap-1 border-black/10 dark:border-white/10 hover:bg-indigo-500/10 hover:text-indigo-500"
                >
                  <Upload className="h-3 w-3" />
                  {isUploading ? "Uploading..." : "Upload Photo"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="h-7 text-xs rounded-lg gap-1 border-black/10 dark:border-white/10"
                >
                  <LinkIcon className="h-3 w-3" />
                  Image URL
                </Button>

                {imageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setImageUrl("")}
                    className="h-7 text-xs rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 px-2"
                    title="Remove custom photo"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Custom URL Input Accordion */}
            {showUrlInput && (
              <div className="px-4 pb-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Input
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="Paste direct image URL (https://...)"
                  className="h-8 text-xs bg-white dark:bg-black/20"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUrlSubmit}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Apply
                </Button>
              </div>
            )}

            {/* Avatar Presets Row */}
            <div className="px-4 pb-3 pt-1 border-t border-black/5 dark:border-white/5">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5">
                Or pick an aesthetic preset:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = imageUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`relative h-10 w-10 shrink-0 rounded-full overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/50 scale-105"
                          : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
                      }`}
                      title={preset.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="h-full w-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DISPLAY NAME INPUT */}
          <div className="space-y-1.5">
            <label className="uppercase text-[11px] font-bold text-zinc-600 dark:text-zinc-300 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                Display Name / Username
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {name.length}/32
              </span>
            </label>
            <Input
              disabled={isLoading}
              maxLength={32}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your display name"
              className="bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-2 px-3.5 h-10"
            />
            {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
          </div>

          {/* BANNER THEME SELECTOR */}
          <div className="space-y-1.5">
            <label className="uppercase text-[11px] font-bold text-zinc-600 dark:text-zinc-300 tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Banner Gradient Theme
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BANNER_THEMES.map((theme) => {
                const isSelected = bannerTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setBannerTheme(theme.id)}
                    className={`h-9 rounded-xl bg-gradient-to-r ${theme.gradient} relative transition-all duration-200 border-2 ${
                      isSelected
                        ? "border-white ring-2 ring-indigo-500 scale-105 shadow-md"
                        : "border-transparent opacity-70 hover:opacity-100 hover:scale-102"
                    }`}
                    title={theme.name}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white drop-shadow stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ONLINE STATUS SELECTOR */}
          <div className="space-y-1.5">
            <label className="uppercase text-[11px] font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">
              Online Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("online")}
                className={`flex items-center gap-x-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  status === "online"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                    : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0" />
                <div className="text-left leading-tight">
                  <p className="font-bold">Online</p>
                  <p className="text-[10px] text-zinc-400 font-normal">Ready to chat & call</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus("idle")}
                className={`flex items-center gap-x-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  status === "idle"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30"
                    : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-amber-400 flex items-center justify-center text-[8px] font-bold text-zinc-900 shrink-0">
                  🌙
                </span>
                <div className="text-left leading-tight">
                  <p className="font-bold">Idle</p>
                  <p className="text-[10px] text-zinc-400 font-normal">Away from keyboard</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus("dnd")}
                className={`flex items-center gap-x-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  status === "dnd"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30"
                    : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0" />
                <div className="text-left leading-tight">
                  <p className="font-bold">Do Not Disturb</p>
                  <p className="text-[10px] text-zinc-400 font-normal">Mute sound alerts</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus("invisible")}
                className={`flex items-center gap-x-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                  status === "invisible"
                    ? "border-zinc-500 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-500/30"
                    : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span className="h-3 w-3 rounded-full border-2 border-zinc-400 bg-transparent shrink-0" />
                <div className="text-left leading-tight">
                  <p className="font-bold">Invisible</p>
                  <p className="text-[10px] text-zinc-400 font-normal">Appear offline</p>
                </div>
              </button>
            </div>
          </div>

          {/* CUSTOM STATUS MESSAGE */}
          <div className="space-y-2">
            <label className="uppercase text-[11px] font-bold text-zinc-600 dark:text-zinc-300 tracking-wider flex items-center justify-between">
              <span>Custom Status Message</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {customStatus.length}/100
              </span>
            </label>
            <Input
              disabled={isLoading}
              maxLength={100}
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. Exploring servers / Coding / Listening to music..."
              className="bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-2 px-3.5 h-10"
            />

            {/* Quick Status Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {STATUS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCustomStatus(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-black/5 dark:border-white/5 hover:bg-indigo-500/10 hover:text-indigo-500 hover:border-indigo-500/20 text-zinc-600 dark:text-zinc-400 transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <DialogFooter className="bg-zinc-50 dark:bg-[#18191c] px-6 py-3.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading || isUploading}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || isUploading || !name.trim()}
            className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 px-6 py-2 transition duration-200"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
