"use client";

import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, SendHorizonal } from "lucide-react";
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="px-3 pb-3 pt-1">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative flex items-center rounded-2xl bg-[#232428] border border-black/10 dark:border-white/10 transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-400/60 shadow-lg shadow-black/10 backdrop-blur-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      onOpen("messageFile", { apiUrl, query })
                    }
                    className="ml-2.5 h-8 w-8 rounded-xl bg-zinc-700/60 text-zinc-300 hover:bg-indigo-500 hover:text-white transition-colors flex items-center justify-center focus:outline-none flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <Input
                    placeholder={`Message ${
                      type === "conversation" ? "@" + name : "#" + name
                    }...`}
                    disabled={isLoading}
                    className="h-12 px-3 bg-transparent border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-100 placeholder:text-zinc-400 text-sm font-normal"
                    {...field}
                  />
                  <div className="mr-1.5 flex-shrink-0">
                    <EmojiPicker
                      onChange={(emoji: string) =>
                        field.onChange(`${field.value} ${emoji}`)
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !field.value.trim()}
                    className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-zinc-700/50 disabled:text-zinc-500 disabled:shadow-none"
                  >
                    <SendHorizonal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
