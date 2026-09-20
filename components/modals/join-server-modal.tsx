"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Link2 } from "lucide-react";

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

export function JoinServerModal() {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "joinServer";

  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setInviteUrl("");
    setError("");
    setIsLoading(false);
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = inviteUrl.trim();
    if (!trimmed) {
      setError("Please enter a valid invite link or invite code.");
      return;
    }

    // Extract invite code if a full URL was pasted
    let inviteCode = trimmed;
    if (trimmed.includes("/invite/")) {
      const parts = trimmed.split("/invite/");
      inviteCode = parts[parts.length - 1]?.split("?")[0]?.split("/")[0] || trimmed;
    } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parts = trimmed.split("/");
      inviteCode = parts[parts.length - 1]?.split("?")[0] || trimmed;
    }

    if (!inviteCode) {
      setError("Could not extract a valid invite code from this link.");
      return;
    }

    try {
      setIsLoading(true);
      router.push(`/invite/${inviteCode}`);
      handleClose();
    } catch (err) {
      console.error(err);
      setError("Failed to join server. Please check the invite code.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl">
        <DialogHeader className="pt-8 px-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Compass className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl text-center font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Join a Server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Enter an invitation link or invite code below to join an existing server.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4 px-6">
            <div className="space-y-2">
              <label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-x-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Invite Link or Code
              </label>
              <Input
                disabled={isLoading}
                value={inviteUrl}
                onChange={(e) => {
                  setInviteUrl(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. 431f2190-d77a... or https://.../invite/..."
                className="bg-zinc-100 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl placeholder:text-zinc-400 py-5"
              />
              {error && (
                <p className="text-xs font-medium text-rose-500">{error}</p>
              )}
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                Invites should look like:
              </p>
              <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                https://yourdomain.com/invite/8a1f2...
              </p>
              <p className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                or just the code: 8a1f2...
              </p>
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
              disabled={isLoading || !inviteUrl.trim()}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 px-6 py-2 transition"
            >
              {isLoading ? "Joining..." : "Join Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
