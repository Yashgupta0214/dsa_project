"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

interface ServerSearchProps {
  data: {
    label: string;
    type: "channel" | "member";
    data:
      | {
          icon: React.ReactNode;
          name: string;
          id: string;
        }[]
      | undefined;
  }[];
}

export function ServerSearch({ data }: ServerSearchProps) {
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const onClick = ({
    id,
    type
  }: {
    id: string;
    type: "channel" | "member";
  }) => {
    setOpen(false);

    if (type === "member")
      return router.push(`/servers/${params?.serverId}/conversations/${id}`);

    if (type === "channel")
      return router.push(`/servers/${params?.serverId}/channels/${id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group px-3 py-1.5 rounded-lg items-center flex gap-x-2.5 w-full bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition duration-200 shadow-sm focus:outline-none"
      >
        <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 transition-colors" />
        <p className="font-medium text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition">
          Quick search...
        </p>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-1.5 font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400 ml-auto">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search all channels and members..." />
        <CommandList className="max-h-[320px] p-2">
          <CommandEmpty>No results found.</CommandEmpty>
          {data.map(({ label, type, data }) => {
            if (!data?.length) return null;

            return (
              <CommandGroup key={label} heading={label}>
                {data?.map(({ id, icon, name }) => {
                  return (
                    <CommandItem
                      key={id}
                      onSelect={() => onClick({ id, type })}
                      className="rounded-lg cursor-pointer my-0.5"
                    >
                      {icon}
                      <span className="font-medium">{name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
