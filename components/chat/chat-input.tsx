"use client";

import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import axios from "axios";
import qs from "query-string";
import { useRouter } from "next/navigation";

import {
  FormControl,
  Form,
  FormField,
  FormItem
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { EmojiPicker } from "@/components/emoji-picker";

interface ChatInputProps {
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
}

const formSchema = z.object({
  content: z.string().min(1)
});

export function ChatInput({ apiUrl, query, name, type }: ChatInputProps) {
  const { onOpen } = useModal();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: "" }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: apiUrl,
        query
      });

      await axios.post(url, values);

      form.reset();
      router.refresh();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 pb-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative flex items-center rounded-2xl bg-zinc-200/80 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/25 focus-within:border-indigo-500/40 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      onOpen("messageFile", { apiUrl, query })
                    }
                    className="ml-3 h-7 w-7 rounded-full bg-zinc-400 dark:bg-zinc-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 transition-colors flex items-center justify-center text-white focus:outline-none flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <Input
                    placeholder={`Message ${
                      type === "conversation" ? "@" + name : "#" + name
                    }...`}
                    disabled={isLoading}
                    className="py-6 px-3 bg-transparent border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-sm font-normal"
                    {...field}
                  />
                  <div className="mr-3 flex-shrink-0">
                    <EmojiPicker
                      onChange={(emoji: string) =>
                        field.onChange(`${field.value} ${emoji}`)
                      }
                    />
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
