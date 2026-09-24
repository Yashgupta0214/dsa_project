"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { ChannelType } from "@prisma/client";
import qs from "query-string";
import { Hash, Mic, Video } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import { useModal } from "@/hooks/use-modal-store";

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Channel name is required." })
    .refine((name) => name.toLowerCase() !== "general", {
      message: "Channel name cannot be 'general'."
    }),
  type: z.nativeEnum(ChannelType)
});

export function CreateChannelModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const params = useParams();

  const isModalOpen = isOpen && type === "createChannel";
  const { channelType } = data;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: channelType || ChannelType.TEXT
    }
  });

  useEffect(() => {
    if (isModalOpen) {
      form.setValue("type", channelType || ChannelType.TEXT);
      form.setValue("name", "");
    }
  }, [channelType, isModalOpen, form]);

  const isLoading = form.formState.isSubmitting;
  const currentType = form.watch("type");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const serverId = params?.serverId;
      if (!serverId) return;

      const url = qs.stringifyUrl({
        url: "/api/channels",
        query: { serverId }
      });

      const response = await axios.post(url, values);
      const createdChannel = response.data;

      form.reset();
      onClose();

      if (createdChannel?.id) {
        router.push(`/servers/${serverId}/channels/${createdChannel.id}`);
      }
      router.refresh();
    } catch (error) {
      console.error("[CREATE_CHANNEL]", error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-md">
        <DialogHeader className="pt-7 px-6 pb-2">
          <DialogTitle className="text-xl text-center font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Create Channel
          </DialogTitle>
          <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-1">
            in {currentType === ChannelType.TEXT ? "Text" : currentType === ChannelType.AUDIO ? "Voice" : "Video"} Channels
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4 px-6">
              {/* Channel Type Selector Grid */}
              <div className="space-y-2">
                <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                  Channel Type
                </FormLabel>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue("type", ChannelType.TEXT)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      currentType === ChannelType.TEXT
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-500 shrink-0">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Text Channel</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Post messages, images, code snippets, and mentions
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => form.setValue("type", ChannelType.AUDIO)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      currentType === ChannelType.AUDIO
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0">
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Voice Channel</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Hang out with low-latency voice, audio, and sound
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => form.setValue("type", ChannelType.VIDEO)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      currentType === ChannelType.VIDEO
                        ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
                        : "border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Video Channel</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        HD video conference, camera, and screen sharing
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Channel Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                      Channel Name
                    </FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-zinc-400">
                          {currentType === ChannelType.TEXT && <Hash className="w-4 h-4" />}
                          {currentType === ChannelType.AUDIO && <Mic className="w-4 h-4" />}
                          {currentType === ChannelType.VIDEO && <Video className="w-4 h-4" />}
                        </span>
                        <Input
                          disabled={isLoading}
                          placeholder={
                            currentType === ChannelType.TEXT
                              ? "e.g. general-chat"
                              : currentType === ChannelType.AUDIO
                              ? "e.g. Voice Lounge"
                              : "e.g. Study Room"
                          }
                          className="pl-9 bg-zinc-100 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl placeholder:text-zinc-400 py-5 text-sm"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="bg-zinc-50 dark:bg-[#18191c] px-6 py-4 border-t border-black/5 dark:border-white/5">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs font-semibold mr-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.watch("name")?.trim()}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 px-6 py-2 transition text-xs"
              >
                {isLoading ? "Creating..." : "Create Channel"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

