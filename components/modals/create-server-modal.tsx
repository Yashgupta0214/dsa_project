"use client";

import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FileUpload } from "@/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().optional()
});

export function CreateServerModal() {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "createServer";

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: ""
    }
  });

  const [isTemporary, setIsTemporary] = React.useState(false);
  const [expiryDays, setExpiryDays] = React.useState(7);
  const [expiryAction, setExpiryAction] = React.useState<"archive" | "delete">("delete");
  const [customTimestamp, setCustomTimestamp] = React.useState<number | null>(null);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.post("/api/servers", values);
      const newServer = response.data;

      if (newServer && newServer.id && isTemporary) {
        const finalExpiry = customTimestamp || Date.now() + expiryDays * 24 * 60 * 60 * 1000;
        const extendedSettings = {
          isTemporary: true,
          expiryTimestamp: finalExpiry,
          expiryAction: expiryAction
        };
        localStorage.setItem(
          `server_settings_${newServer.id}`,
          JSON.stringify(extendedSettings)
        );
      }

      form.reset();
      setIsTemporary(false);
      setCustomTimestamp(null);
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Create your server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Give your server a personality with a name and an image. You can
            always change it later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6 px-6">
              <div className="flex items-center justify-center text-center">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
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
              </div>
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
                        className="bg-zinc-100 dark:bg-white/[0.06] border border-black/5 dark:border-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500 text-zinc-900 dark:text-white rounded-xl placeholder:text-zinc-400 py-5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-rose-500" />
                  </FormItem>
                )}
              />

              {/* Temporary Server Mode Toggle */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Set as Temporary Server
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Auto-expires after a set period (study group, event, test server)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTemporary(!isTemporary)}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                      isTemporary ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        isTemporary ? "translate-x-4.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {isTemporary && (
                  <div className="space-y-3 pt-1">
                    {/* Action Selector */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                        Action Upon Expiry:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExpiryAction("delete")}
                          className={`p-2 rounded-lg border text-left text-xs font-bold transition ${
                            expiryAction === "delete"
                              ? "border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-400"
                              : "border-black/10 dark:border-white/10 text-zinc-500"
                          }`}
                        >
                          🗑️ Auto-Delete Server
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpiryAction("archive")}
                          className={`p-2 rounded-lg border text-left text-xs font-bold transition ${
                            expiryAction === "archive"
                              ? "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "border-black/10 dark:border-white/10 text-zinc-500"
                          }`}
                        >
                          🔒 Archive (Read-Only)
                        </button>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                        Select Lifespan Duration:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { label: "1 Min (Test)", days: 1 / 1440 },
                          { label: "5 Mins", days: 5 / 1440 },
                          { label: "1 Hour", days: 1 / 24 },
                          { label: "1 Day", days: 1 },
                          { label: "7 Days", days: 7 },
                          { label: "30 Days", days: 30 }
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => {
                              setExpiryDays(p.days);
                              setCustomTimestamp(Date.now() + p.days * 24 * 60 * 60 * 1000);
                            }}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                              expiryDays === p.days
                                ? "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "border-black/5 dark:border-white/10 hover:bg-black/5 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Datetime Input */}
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                        Or Pick Exact Custom Expiry Date & Time:
                      </span>
                      <input
                        type="datetime-local"
                        value={
                          customTimestamp
                            ? new Date(customTimestamp - new Date().getTimezoneOffset() * 60000)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            setCustomTimestamp(new Date(e.target.value).getTime());
                          }
                        }}
                        className="w-full bg-white dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white rounded-lg p-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="bg-zinc-50 dark:bg-[#18191c] px-6 py-4 border-t border-black/5 dark:border-white/5">
              <Button
                disabled={isLoading}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 px-6 py-2 transition"
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
