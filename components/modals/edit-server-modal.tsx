"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Plus,
  Webhook as WebhookIcon,
  Copy,
  CheckCheck,
  Radio,
  Send,
  Wand2,
  RefreshCw
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
import { Channel } from "@prisma/client";

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().min(1, { message: "Server image is required." })
});

type ServerTab = "overview" | "integrations" | "temporary" | "moderation" | "privacy";

interface WebhookItem {
  id: string;
  name: string;
  avatarUrl?: string;
  token?: string;
  channelId: string;
  channel?: { name: string };
  createdAt: string;
}

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

  // Webhooks State
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [copiedWebhookId, setCopiedWebhookId] = useState<string | null>(null);
  const [testSuccessId, setTestSuccessId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: ""
    }
  });

  const loadWebhooksAndChannels = useCallback(async () => {
    if (!server?.id) return;
    try {
      const [whRes, chRes] = await Promise.all([
        axios.get(`/api/servers/${server.id}/webhooks`),
        axios.get(`/api/channels?serverId=${server.id}`)
      ]);
      const fetchedWebhooks = whRes.data || [];
      const fetchedChannels = chRes.data || [];

      setWebhooks(fetchedWebhooks);
      setChannels(fetchedChannels);

      if (fetchedChannels.length > 0) {
        setSelectedChannelId((prev) =>
          prev && fetchedChannels.some((c: Channel) => c.id === prev)
            ? prev
            : fetchedChannels[0].id
        );
      }
    } catch (e) {
      console.error("Error loading webhooks or channels:", e);
    }
  }, [server?.id]);

  useEffect(() => {
    if (server && isModalOpen) {
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

      loadWebhooksAndChannels();
    }
  }, [server, isModalOpen, form, loadWebhooksAndChannels]);

  // Temporary countdown ticker
  useEffect(() => {
    if (!isTemporary || !expiryTimestamp) {
      setCountdownText("");
      return;
    }

    const updateCountdown = () => {
      const diff = expiryTimestamp - Date.now();
      if (diff <= 0) {
        setCountdownText(expiryAction === "archive" ? "Server Locked / Archived" : "Server Expired");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdownText(`${days}d ${hours}h ${minutes}m ${seconds}s`);
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

  const handleCreateWebhook = async () => {
    if (!server?.id || !newWebhookName.trim() || !selectedChannelId) return;
    try {
      setIsCreatingWebhook(true);
      const res = await axios.post(`/api/servers/${server.id}/webhooks`, {
        name: newWebhookName.trim(),
        channelId: selectedChannelId
      });
      setWebhooks((prev) => [res.data, ...prev]);
      setNewWebhookName("");
    } catch (err) {
      console.error("Failed to create webhook:", err);
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const handleAutoConfigureAll = async () => {
    if (!server?.id) return;
    try {
      setIsAutoConfiguring(true);
      const res = await axios.post(`/api/servers/${server.id}/webhooks/auto`);
      if (res.data?.webhooks) {
        setWebhooks(res.data.webhooks);
      }
    } catch (err) {
      console.error("Failed to auto-configure webhooks:", err);
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!server?.id) return;
    try {
      await axios.delete(`/api/servers/${server.id}/webhooks/${webhookId}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
    } catch (err) {
      console.error("Failed to delete webhook:", err);
    }
  };

  const handleCopyWebhookUrl = (webhookId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/api/socket/webhooks/${webhookId}`;
    navigator.clipboard.writeText(url);
    setCopiedWebhookId(webhookId);
    setTimeout(() => setCopiedWebhookId(null), 2500);
  };

  const handleTestWebhookPing = async (webhook: WebhookItem) => {
    try {
      await axios.post(`/api/socket/webhooks/${webhook.id}`, {
        content: `🚀 Notification Alert: Webhook "${webhook.name}" tested successfully! Everyone receives this instant notification on their devices.`,
        username: webhook.name
      });
      setTestSuccessId(webhook.id);
      setTimeout(() => setTestSuccessId(null), 3000);
    } catch (err) {
      console.error("Failed to send webhook test:", err);
    }
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl md:h-[620px] h-[90vh] flex flex-col md:flex-row">
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
                onClick={() => setActiveTab("integrations")}
                className={`w-full flex items-center gap-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "integrations"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <WebhookIcon className="h-4 w-4 text-emerald-500" />
                Webhooks & Alerts
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
                              <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                Server Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  disabled={isLoading}
                                  className="bg-zinc-100 dark:bg-[#111214] border-0 text-zinc-800 dark:text-zinc-200 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                  placeholder="Enter server name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: WEBHOOKS & INTEGRATIONS */}
                {activeTab === "integrations" && (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <WebhookIcon className="h-5 w-5 text-emerald-500" />
                          Channel Webhooks & Real-time Alerts
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          External bots, GitHub, or automated scripts can post messages to notify all users on their devices.
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isAutoConfiguring}
                        onClick={handleAutoConfigureAll}
                        className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs shrink-0"
                      >
                        <Wand2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        {isAutoConfiguring ? "Configuring..." : "Auto-Configure All"}
                      </Button>
                    </div>

                    {/* Create New Webhook Box */}
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Create Custom Webhook
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <Input
                          placeholder="Webhook Name (e.g. GitHub CI, Deploy Bot)"
                          value={newWebhookName}
                          onChange={(e) => setNewWebhookName(e.target.value)}
                          className="bg-white dark:bg-[#111214] border-zinc-200 dark:border-zinc-700 text-xs flex-1"
                        />

                        <select
                          value={selectedChannelId}
                          onChange={(e) => setSelectedChannelId(e.target.value)}
                          className="bg-white dark:bg-[#111214] border border-zinc-200 dark:border-zinc-700 text-xs rounded-lg px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {channels.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              #{ch.name}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          size="sm"
                          disabled={!newWebhookName.trim() || isCreatingWebhook}
                          onClick={handleCreateWebhook}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          {isCreatingWebhook ? "Creating..." : "Create Webhook"}
                        </Button>
                      </div>
                    </div>

                    {/* Webhook List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                          Active Server Webhooks ({webhooks.length})
                        </p>
                        <button
                          type="button"
                          onClick={loadWebhooksAndChannels}
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                      </div>

                      {webhooks.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs">
                          No webhooks configured yet. Click &quot;Auto-Configure All&quot; above to generate webhooks for all channels!
                        </div>
                      ) : (
                        webhooks.map((wh) => (
                          <div
                            key={wh.id}
                            className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex flex-col gap-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">
                                  {wh.name}
                                </span>
                                {wh.channel && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-semibold">
                                    #{wh.channel.name}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleTestWebhookPing(wh)}
                                  className="text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 h-7"
                                >
                                  {testSuccessId === wh.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 mr-1" /> Sent!
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3.5 h-3.5 mr-1" /> Test Ping
                                    </>
                                  )}
                                </Button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteWebhook(wh.id)}
                                  className="text-zinc-400 hover:text-rose-500 p-1 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                readOnly
                                value={
                                  typeof window !== "undefined"
                                    ? `${window.location.origin}/api/socket/webhooks/${wh.id}`
                                    : `/api/socket/webhooks/${wh.id}`
                                }
                                className="w-full text-xs font-mono bg-zinc-100 dark:bg-[#111214] text-zinc-500 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 select-all"
                              />

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleCopyWebhookUrl(wh.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 shrink-0"
                              >
                                {copiedWebhookId === wh.id ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5 mr-1" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: TEMPORARY MODE */}
                {activeTab === "temporary" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Timer className="h-5 w-5 text-amber-500" />
                        Temporary Server Mode
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Set self-destruct or auto-archive timers for event servers.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div>
                        <p className="text-xs font-bold text-amber-500">Enable Temporary Lifespan</p>
                        <p className="text-[11px] text-zinc-500">Auto archive or delete when countdown finishes</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsTemporary(!isTemporary)}
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
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExpiryDays(1)}
                            className="text-xs"
                          >
                            1 Day
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExpiryDays(7)}
                            className="text-xs"
                          >
                            7 Days
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExpiryDays(30)}
                            className="text-xs"
                          >
                            30 Days
                          </Button>
                        </div>
                        {countdownText && (
                          <p className="text-xs text-amber-400 font-mono text-center">
                            Time Remaining: {countdownText}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: MODERATION & COOLDOWN */}
                {activeTab === "moderation" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Moderation</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Configure slow mode rate limits and content moderation filters.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-zinc-500">Chat Slowmode</label>
                      <div className="grid grid-cols-4 gap-2">
                        {["off", "5s", "30s", "1m"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setSlowMode(m)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold uppercase transition ${
                              slowMode === m
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                                : "border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: ACCESS & SECURITY */}
                {activeTab === "privacy" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Access & Security</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Manage community discoverability and member verification standards.
                      </p>
                    </div>

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
