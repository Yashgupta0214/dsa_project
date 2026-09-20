"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Moon, ShieldCheck, User, UserCheck } from "lucide-react";

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
import { FileUpload } from "@/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";
import { UserAvatar } from "@/components/user-avatar";

export function EditProfileModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "editProfile";
  const { profile } = data;

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"online" | "idle" | "dnd" | "invisible">("online");
  const [customStatus, setCustomStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setImageUrl(profile.imageUrl || "");
    }
    const savedStatus = localStorage.getItem("user_custom_status");
    if (savedStatus) setCustomStatus(savedStatus);
    const savedPresence = localStorage.getItem("user_presence_status") as any;
    if (savedPresence) setStatus(savedPresence);
  }, [profile, isModalOpen]);

  const handleClose = () => {
    setError("");
    setIsLoading(false);
    onClose();
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
      window.dispatchEvent(new Event("user_status_changed"));

      router.refresh();
      handleClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-md">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-extrabold tracking-tight text-zinc-900 dark:text-white">
            User Profile Settings
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Customize your username, avatar, and active status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-4 px-6">
            {/* Avatar upload / preview */}
            <div className="flex flex-col items-center justify-center text-center">
              <FileUpload
                endpoint="serverImage"
                value={imageUrl}
                onChange={(url) => setImageUrl(url || "")}
              />
            </div>

            {/* Display Name Input */}
            <div className="space-y-1.5">
              <label className="uppercase text-xs font-bold text-zinc-600 dark:text-zinc-300 tracking-wider flex items-center gap-x-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                Username / Display Name
              </label>
              <Input
                disabled={isLoading}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your username"
                className="bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-5"
              />
              {error && (
                <p className="text-xs font-medium text-rose-500">{error}</p>
              )}
            </div>

            {/* Status presence selector */}
            <div className="space-y-1.5">
              <label className="uppercase text-xs font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Online Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("online")}
                  className={`flex items-center gap-x-2 p-2 rounded-xl border text-xs font-semibold transition ${
                    status === "online"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  Online
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className={`flex items-center gap-x-2 p-2 rounded-xl border text-xs font-semibold transition ${
                    status === "idle"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                  Idle
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("dnd")}
                  className={`flex items-center gap-x-2 p-2 rounded-xl border text-xs font-semibold transition ${
                    status === "dnd"
                      ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                  Do Not Disturb
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("invisible")}
                  className={`flex items-center gap-x-2 p-2 rounded-xl border text-xs font-semibold transition ${
                    status === "invisible"
                      ? "border-zinc-500 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300"
                      : "border-black/5 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/[0.04] text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-zinc-400 bg-transparent" />
                  Invisible
                </button>
              </div>
            </div>

            {/* Custom status message */}
            <div className="space-y-1.5">
              <label className="uppercase text-xs font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">
                Custom Status Message
              </label>
              <Input
                disabled={isLoading}
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="e.g. Exploring servers / Coding / Listening to music..."
                className="bg-zinc-100 dark:bg-white/[0.06] border border-black/10 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-5"
              />
            </div>
          </div>

          <DialogFooter className="bg-zinc-50 dark:bg-[#18191c] px-6 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
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
              disabled={isLoading || !name.trim()}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 px-6 py-2 transition"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
