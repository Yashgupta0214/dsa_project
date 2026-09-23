"use client";

import React, { useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { useTheme as useNextTheme } from "next-themes";
import {
  User,
  Palette,
  Mic,
  Bell,
  LogOut,
  X,
  Check,
  Shield,
  Volume2,
  Moon,
  Sun,
  Laptop,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/components/providers/notification-provider";
import { playNotificationSound } from "@/lib/notification-sound";

type SettingsTab = "account" | "appearance" | "voice" | "notifications";

export function UserSettingsModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { profile } = data;
  const { setTheme, theme } = useNextTheme();
  const {
    permission,
    requestPermission,
    soundEnabled,
    setSoundEnabled,
    deviceNotificationsEnabled,
    setDeviceNotificationsEnabled
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [micVolume, setMicVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [allowDms, setAllowDms] = useState(true);

  const isModalOpen = isOpen && type === "userSettings";

  if (!isModalOpen || !profile) return null;

  const handleTestNotification = async () => {
    playNotificationSound();
    if ("Notification" in window) {
      let perm = Notification.permission;
      if (perm !== "granted") {
        perm = await requestPermission();
      }
      if (perm === "granted") {
        new Notification("🔔 Discord Notification Test", {
          body: "Device notifications are working smoothly! You will get notified on all incoming texts.",
          icon: profile.imageUrl || "/favicon.ico"
        });
      }
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-[#1e1f22] text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl md:h-[620px] h-[90vh] flex flex-col md:flex-row">
        {/* Left Side Navigation Sidebar */}
        <div className="w-full md:w-64 bg-[#f2f3f5] dark:bg-[#111214] p-4 flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="space-y-4">
            <div className="px-3 py-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                User Settings
              </h2>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("account")}
                className={`w-full flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "account"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <User className="h-4 w-4" />
                My Account
              </button>

              <button
                onClick={() => setActiveTab("appearance")}
                className={`w-full flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "appearance"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Palette className="h-4 w-4" />
                Appearance
              </button>

              <button
                onClick={() => setActiveTab("voice")}
                className={`w-full flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "voice"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Mic className="h-4 w-4" />
                Voice & Video
              </button>

              <button
                onClick={() => setActiveTab("notifications")}
                className={`w-full flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "notifications"
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Bell className="h-4 w-4" />
                Notifications & Alerts
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <SignOutButton signOutCallback={() => onClose()}>
              <button
                className="w-full flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </SignOutButton>
          </div>
        </div>

        {/* Right Side Settings Panel */}
        <div className="flex-1 p-6 overflow-y-auto relative bg-white dark:bg-[#1e1f22]">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>

          {/* TAB 1: MY ACCOUNT */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">My Account</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">View and manage your profile details</p>
              </div>

              {/* Profile Card Banner */}
              <div className="relative rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-4 pt-12 shadow-lg">
                <div className="bg-white dark:bg-[#2b2d31] rounded-xl p-4 shadow-md flex items-center gap-x-4">
                  <div className="relative -mt-10">
                    <UserAvatar src={profile.imageUrl} className="h-20 w-20 ring-4 ring-white dark:ring-[#2b2d31] shadow-xl" />
                    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#2b2d31]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">{profile.name}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{profile.email}</p>
                  </div>
                </div>
              </div>

              {/* Detail Items */}
              <div className="bg-zinc-50 dark:bg-[#2b2d31]/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Display Name</p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{profile.name}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold">Active</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">Email Address</p>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{profile.email}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">Verified</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase">User ID</p>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{profile.userId}</p>
                  </div>
                  <Shield className="h-4 w-4 text-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Appearance</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Customize how your Discord experience looks</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-zinc-500">Theme Selector</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-y-2 transition ${
                      theme === "dark"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-xs">Dark Mode</span>
                  </button>

                  <button
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-y-2 transition ${
                      theme === "light"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-xs">Light Mode</span>
                  </button>

                  <button
                    onClick={() => setTheme("system")}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-y-2 transition ${
                      theme === "system"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-500 font-bold"
                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Laptop className="h-6 w-6" />
                    <span className="text-xs">System</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE & VIDEO */}
          {activeTab === "voice" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Voice & Video Settings</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure LiveKit microphone and speaker volume</p>
              </div>

              <div className="space-y-4 bg-zinc-50 dark:bg-[#2b2d31]/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span>Input Volume (Microphone)</span>
                    <span className="text-indigo-500 font-bold">{micVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={micVolume}
                    onChange={(e) => setMicVolume(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span>Output Volume (Headphones/Speakers)</span>
                    <span className="text-indigo-500 font-bold">{outputVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={outputVolume}
                    onChange={(e) => setOutputVolume(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 flex items-center gap-x-3">
                <Volume2 className="h-6 w-6 text-indigo-500 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-indigo-500">LiveKit Audio Ready</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Voice channels automatically use these audio levels when joining.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS & PRIVACY */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Notifications & Device Alerts</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Receive instant push notifications and audio chimes whenever anyone texts</p>
              </div>

              {/* Desktop / Device Notifications Card */}
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Device / Desktop Push Notifications
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Shows native OS system banners on Windows/Mac/Mobile even when tab is backgrounded
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      permission === "granted"
                        ? "bg-emerald-500/20 text-emerald-500"
                        : permission === "denied"
                        ? "bg-rose-500/20 text-rose-500"
                        : "bg-amber-500/20 text-amber-500"
                    }`}
                  >
                    {permission}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {permission !== "granted" ? (
                    <Button
                      size="sm"
                      onClick={requestPermission}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      <Bell className="w-3.5 h-3.5 mr-1.5" />
                      Allow Device Notifications
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Device notifications active
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestNotification}
                    className="border-zinc-300 dark:border-zinc-700 text-xs"
                  >
                    Send Test Ping
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Sound Chimes Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-[#2b2d31]/50 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Enable Notification Sounds</p>
                    <p className="text-xs text-zinc-500">Play real-time audio chime whenever new messages or webhooks arrive</p>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      soundEnabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        soundEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Device Push Notifications Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-[#2b2d31]/50 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Desktop System Banners</p>
                    <p className="text-xs text-zinc-500">Display notifications in your computer / phone notification center</p>
                  </div>
                  <button
                    onClick={() => setDeviceNotificationsEnabled(!deviceNotificationsEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      deviceNotificationsEnabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        deviceNotificationsEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Direct Messages Privacy */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-[#2b2d31]/50 border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Allow Direct Messages</p>
                    <p className="text-xs text-zinc-500">Allow server members to send you private DMs</p>
                  </div>
                  <button
                    onClick={() => setAllowDms(!allowDms)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${
                      allowDms ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        allowDms ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
