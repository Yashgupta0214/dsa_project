"use client";

import React, { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import axios from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useModal } from "@/hooks/use-modal-store";
import { useOrigin } from "@/hooks/use-origin";

export function InviteModal() {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const origin = useOrigin();

  const isModalOpen = isOpen && type === "invite";
  const { server } = data;

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inviteUrl = `${origin}/invite/${server?.inviteCode}`;

  const onCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  const onNew = async () => {
    try {
      setIsLoading(true);

      const response = await axios.patch(
        `/api/servers/${server?.id}/invite-code`
      );

      onOpen("invite", { server: response.data });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Invite Friends
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div>
            <Label className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
              Server invite link
            </Label>
            <div className="flex items-center mt-2 gap-x-2">
              <Input
                readOnly
                disabled={isLoading}
                value={inviteUrl}
                className="bg-zinc-100 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl py-5 text-sm"
              />
              <Button
                disabled={isLoading}
                onClick={onCopy}
                size="icon"
                className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 flex-shrink-0 transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Copy className="w-4 h-4 text-white" />
                )}
              </Button>
            </div>
          </div>
          <Button
            disabled={isLoading}
            onClick={onNew}
            variant="link"
            size="sm"
            className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold p-0 transition flex items-center gap-1.5"
          >
            Generate a new link
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
