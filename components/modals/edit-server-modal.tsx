"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  Sliders,
  ShieldCheck,
  Globe,
  Clock,
  Megaphone,
  Sparkles,
  Lock,
  MessageSquare,
  Check,
  Server,
  Timer,
  Archive,
  Trash2,
  Calendar,
  Hourglass,
  Plus
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().min(1, { message: "Server image is required." })
});

type ServerTab = "overview" | "moderation" | "privacy" | "temporary";

export function EditServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "editServer";
  const { server } = data;

  const [activeTab, setActiveTab] = useState<ServerTab>("overview");

  // Advanced Server Settings State (Persisted per Server ID)
  const [description, setDescription] = useState("");
  const [accentTheme, setAccentTheme] = useState("indigo");
  const [slowMode, setSlowMode] = useState("off");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [contentFilter, setContentFilter] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [verificationLevel, setVerificationLevel] = useState("low");

  // Temporary Server Mode State
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const [expiryAction, setExpiryAction] = useState<"archive" | "delete">("archive");
  const [countdownText, setCountdownText] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: ""
    }
  });

  useEffect(() => {
    if (server) {
      form.setValue("name", server.name);
      form.setValue("imageUrl", server.imageUrl);

      try {
        const key = `server_settings_${server.id}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.description !== undefined) setDescription(parsed.description);
          if (parsed.accentTheme !== undefined) setAccentTheme(parsed.accentTheme);
          if (parsed.slowMode !== undefined) setSlowMode(parsed.slowMode);
          if (parsed.welcomeMessage !== undefined) setWelcomeMessage(parsed.welcomeMessage);
          if (parsed.contentFilter !== undefined) setContentFilter(parsed.contentFilter);
          if (parsed.isPublic !== undefined) setIsPublic(parsed.isPublic);
          if (parsed.verificationLevel !== undefined) setVerificationLevel(parsed.verificationLevel);
          if (parsed.isTemporary !== undefined) setIsTemporary(parsed.isTemporary);
          if (parsed.expiryTimestamp !== undefined) setExpiryTimestamp(parsed.expiryTimestamp);
          if (parsed.expiryAction !== undefined) setExpiryAction(parsed.expiryAction);
        } else {
          setDescription("");
          setAccentTheme("indigo");
          setSlowMode("off");
          setWelcomeMessage(`Welcome to ${server.name}! Enjoy your stay.`);
          setContentFilter(true);
          setIsPublic(true);
          setVerificationLevel("low");
          setIsTemporary(false);
          setExpiryTimestamp(null);
          setExpiryAction("archive");
        }
      } catch (err) {
        console.error("Error loading server settings:", err);
      }
    }
  }, [server, form, isModalOpen]);

  // Live Countdown Timer Effect
  useEffect(() => {
    if (!isTemporary || !expiryTimestamp) {
      setCountdownText("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = expiryTimestamp - now;

      if (diff <= 0) {
        setCountdownText(expiryAction === "archive" ? "Expired (Archived / Read-Only)" : "Expired (Scheduled for deletion)");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdownText(`${days}d ${hours}h ${minutes}m remaining`);
      } else {
        setCountdownText(`${hours}h ${minutes}m ${seconds}s remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isTemporary, expiryTimestamp, expiryAction]);

  const setExpiryDays = (days: number) => {
    const target = Date.now() + days * 24 * 60 * 60 * 1000;
    setIsTemporary(true);
    setExpiryTimestamp(target);
  };

  const extendExpiryDays = (days: number) => {
    const currentBase = expiryTimestamp && expiryTimestamp > Date.now() ? expiryTimestamp : Date.now();
    setExpiryTimestamp(currentBase + days * 24 * 60 * 60 * 1000);
    setIsTemporary(true);
  };

  const isLoading = form.formState.isSubmitting;

  const handleClose = () => {
    onClose();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!server) return;

    try {
      const extendedSettings = {
        description: description.trim(),
        accentTheme,
        slowMode,
        welcomeMessage: welcomeMessage.trim(),
        contentFilter,
        isPublic,
        verificationLevel,
        isTemporary,
        expiryTimestamp: isTemporary ? expiryTimestamp : null,
        expiryAction
      };

      localStorage.setItem(
        `server_settings_${server.id}`,
        JSON.stringify(extendedSettings)
      );
      window.dispatchEvent(
        new CustomEvent("server_settings_changed", {
          detail: { serverId: server.id, ...extendedSettings }
        })
      );

      handleClose();
      await axios.patch(`/api/servers/${server.id}`, values);
      router.refresh();
    } catch (error) {
      console.error("[EDIT_SERVER]", error);
    }
  };

  if (!isModalOpen || !server) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl md:h-[600px] h-[90vh] flex flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-56 bg-[#f2f3f5] dark:bg-[#111214] p-4 flex flex-col justify-between border-r border-black/5 dark:border-white/10 flex-shrink-0">
          <div className="space-y-4">
            <div className="px-2 py-1 flex items-center gap-x-2">
              <Server className="h-4 w-4 text-indigo-500" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Server Settings
              </h2>
            </div>

            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`w-full flex items-center gap-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "overview"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Sliders className="h-4 w-4" />
                Overview & Theme
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("temporary")}
                className={`w-full flex items-center gap-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "temporary"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Timer className="h-4 w-4 text-amber-500" />
                Temporary Mode
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("moderation")}
                className={`w-full flex items-center gap-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "moderation"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Moderation & Cooldown
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("privacy")}
                className={`w-full flex items-center gap-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "privacy"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Globe className="h-4 w-4" />
                Access & Security
              </button>
            </nav>
          </div>

          <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] text-zinc-400">
            Server ID: <span className="font-mono text-zinc-500">{server.id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto bg-white dark:bg-[#1e1f22]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col justify-between h-full">
              <div className="p-6 space-y-5 flex-1">
                {/* TAB 1: OVERVIEW & THEME */}
                {activeTab === "overview" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Server Overview</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Customize your server identity, description, and visual theme.
                      </p>
                    </div>

                    <div className="flex items-center gap-x-6">
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem className="flex-shrink-0">
                            <FormControl>
                              <FileUpload
                                endpoint="serverImage"
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex-1 space-y-3">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                                Server Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled={isLoading}
                                  placeholder="Enter server name"
                                  className="bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-4"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-rose-500" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Server Bio / Description */}
                    <div className="space-y-1.5">
                      <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                        Server Community Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Share what this server is about (e.g. Hackathon team / Study group / Gaming event)..."
                        rows={2}
                        className="w-full bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl p-3 text-xs resize-none"
                      />
                    </div>

                    {/* Server Theme Accent Selector */}
                    <div className="space-y-2">
                      <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Server Accent Branding
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: "indigo", label: "Indigo", bg: "bg-indigo-600" },
                          { id: "emerald", label: "Emerald", bg: "bg-emerald-600" },
                          { id: "rose", label: "Rose", bg: "bg-rose-600" },
                          { id: "amber", label: "Amber", bg: "bg-amber-500" },
                          { id: "cyan", label: "Cyan", bg: "bg-cyan-500" }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setAccentTheme(t.id)}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                              accentTheme === t.id
                                ? "border-indigo-500 bg-indigo-500/10 font-bold"
                                : "border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <span className={`h-4 w-4 rounded-full ${t.bg} ring-2 ring-white/20`} />
                            <span className="text-[10px] text-zinc-700 dark:text-zinc-300">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: TEMPORARY SERVER MODE */}
                {activeTab === "temporary" && (
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center gap-x-2">
                        <Timer className="h-5 w-5 text-amber-500" />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Temporary Server Mode</h3>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Perfect for college projects, study groups, hackathons, and tournaments. Set an auto-expiry timer.
                      </p>
                    </div>

                    {/* Enable Temporary Mode Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-x-1.5">
                          <Hourglass className="h-3.5 w-3.5" />
                          Enable Temporary Server Mode
                        </p>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          Automatically expires the server after the specified duration.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isTemporary;
                          setIsTemporary(next);
                          if (next && !expiryTimestamp) {
                            setExpiryDays(7);
                          }
                        }}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${
                          isTemporary ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            isTemporary ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {isTemporary && (
                      <div className="space-y-4">
                        {/* Live Countdown Badge */}
                        <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-x-2.5">
                            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                            <div>
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Current Expiry Countdown</p>
                              <p className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
                                {countdownText || "Calculating..."}
                              </p>
                            </div>
                          </div>
                          {expiryTimestamp && (
                            <span className="text-[11px] text-zinc-400">
                              Expires: {new Date(expiryTimestamp).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Duration Presets & Custom Date Time Picker */}
                        <div className="space-y-3">
                          <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                            Choose Expiry Preset or Custom Date & Time
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {[
                              { label: "1 Day", days: 1 },
                              { label: "3 Days", days: 3 },
                              { label: "7 Days", days: 7 },
                              { label: "14 Days", days: 14 },
                              { label: "30 Days", days: 30 }
                            ].map((p) => (
                              <button
                                key={p.days}
                                type="button"
                                onClick={() => setExpiryDays(p.days)}
                                className="p-2 rounded-xl border border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] hover:bg-indigo-500/10 hover:border-indigo-500 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1 pt-1">
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                              Custom Exact Expiry Date & Time:
                            </span>
                            <input
                              type="datetime-local"
                              value={
                                expiryTimestamp
                                  ? new Date(expiryTimestamp - new Date().getTimezoneOffset() * 60000)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                              onChange={(e) => {
                                if (e.target.value) {
                                  const timestamp = new Date(e.target.value).getTime();
                                  setExpiryTimestamp(timestamp);
                                  setIsTemporary(true);
                                }
                              }}
                              className="w-full bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Extend Duration Controls */}
                        <div className="space-y-2">
                          <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                            <Plus className="h-3.5 w-3.5 text-emerald-500" />
                            Extend Expiry Time
                          </label>
                          <div className="flex gap-x-2">
                            <button
                              type="button"
                              onClick={() => extendExpiryDays(1)}
                              className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition flex items-center gap-x-1"
                            >
                              +1 Day
                            </button>
                            <button
                              type="button"
                              onClick={() => extendExpiryDays(7)}
                              className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition flex items-center gap-x-1"
                            >
                              +7 Days
                            </button>
                            <button
                              type="button"
                              onClick={() => extendExpiryDays(30)}
                              className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition flex items-center gap-x-1"
                            >
                              +30 Days
                            </button>
                          </div>
                        </div>

                        {/* Action Upon Expiry */}
                        <div className="space-y-2">
                          <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                            Action Upon Expiry
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div
                              onClick={() => setExpiryAction("archive")}
                              className={`p-3 rounded-xl border flex items-center gap-x-3 cursor-pointer transition ${
                                expiryAction === "archive"
                                  ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                                  : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                            >
                              <Archive className="h-5 w-5 flex-shrink-0" />
                              <div>
                                <p className="text-xs">Archive Mode</p>
                                <p className="text-[10px] font-normal text-zinc-500">Read-Only mode, preserves chat data</p>
                              </div>
                            </div>

                            <div
                              onClick={() => setExpiryAction("delete")}
                              className={`p-3 rounded-xl border flex items-center gap-x-3 cursor-pointer transition ${
                                expiryAction === "delete"
                                  ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold"
                                  : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                            >
                              <Trash2 className="h-5 w-5 flex-shrink-0 text-rose-500" />
                              <div>
                                <p className="text-xs">Auto-Delete</p>
                                <p className="text-[10px] font-normal text-zinc-500">Permanently delete server upon expiry</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: MODERATION & COOLDOWN */}
                {activeTab === "moderation" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Moderation & Chat Controls</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Set slow mode cooldowns and welcome announcements for member engagement.
                      </p>
                    </div>

                    {/* Slow Mode Selector */}
                    <div className="space-y-2">
                      <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        Slow Mode (Message Cooldown)
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "off", label: "Off" },
                          { id: "5s", label: "5s" },
                          { id: "15s", label: "15s" },
                          { id: "30s", label: "30s" }
                        ].map((sm) => (
                          <button
                            key={sm.id}
                            type="button"
                            onClick={() => setSlowMode(sm.id)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                              slowMode === sm.id
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                : "border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {sm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto Welcome Message */}
                    <div className="space-y-1.5">
                      <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                        <Megaphone className="h-3.5 w-3.5 text-emerald-500" />
                        Auto Member Greeting Banner
                      </label>
                      <Input
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        placeholder="e.g. Welcome to the squad! Introduce yourself in #general."
                        className="bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-4 text-xs"
                      />
                    </div>

                    {/* Content Spam Filter */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/10">
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Automated Content Filter</p>
                        <p className="text-[11px] text-zinc-500">Scan messages from all members for explicit or malicious links</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setContentFilter(!contentFilter)}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${
                          contentFilter ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            contentFilter ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB: ACCESS & SECURITY */}
                {activeTab === "privacy" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Access & Security</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Manage community discoverability and member verification standards.
                      </p>
                    </div>

                    {/* Public Discoverability Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/10">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-x-2">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Public Community Discoverability</p>
                        </div>
                        <p className="text-[11px] text-zinc-500">Allow users to search and join this server via Server Search</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPublic(!isPublic)}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${
                          isPublic ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            isPublic ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Member Verification Selector */}
                    <div className="space-y-2">
                      <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                        <Lock className="h-3.5 w-3.5 text-rose-500" />
                        Member Verification Standard
                      </label>
                      <div className="space-y-2">
                        {[
                          { id: "none", title: "Unrestricted", desc: "Anyone can join and post immediately" },
                          { id: "low", title: "Low Verification", desc: "Must have a verified account email" },
                          { id: "medium", title: "Medium Verification", desc: "Account must be older than 5 minutes" }
                        ].map((v) => (
                          <div
                            key={v.id}
                            onClick={() => setVerificationLevel(v.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              verificationLevel === v.id
                                ? "border-indigo-500 bg-indigo-500/10"
                                : "border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{v.title}</p>
                              <p className="text-[11px] text-zinc-500">{v.desc}</p>
                            </div>
                            {verificationLevel === v.id && (
                              <Check className="h-4 w-4 text-indigo-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="bg-zinc-50 dark:bg-[#18191c] px-6 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 px-6 py-2 transition"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
