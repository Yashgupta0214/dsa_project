"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Hash, Server as ServerIcon } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { useModal } from "@/hooks/use-modal-store";

export function SearchServersModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "searchServers";
  const { servers = [] } = data;

  const onSelect = (serverId: string) => {
    onClose();
    router.push(`/servers/${serverId}`);
  };

  return (
    <CommandDialog open={isModalOpen} onOpenChange={onClose}>
      <CommandInput placeholder="Search your servers by name..." />
      <CommandList className="max-h-[360px] p-2">
        <CommandEmpty>No servers found.</CommandEmpty>
        {!!servers.length && (
          <CommandGroup heading={`Your Servers (${servers.length})`}>
            {servers.map((server) => (
              <CommandItem
                key={server.id}
                onSelect={() => onSelect(server.id)}
                className="flex items-center gap-x-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-indigo-500/10 dark:hover:bg-white/[0.08] transition my-1"
              >
                {server.imageUrl ? (
                  <div className="relative h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 border border-black/10 dark:border-white/10">
                    <Image
                      src={server.imageUrl}
                      alt={server.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-500 dark:bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <ServerIcon className="h-4 w-4" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {server.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-x-1">
                    <Hash className="h-3 w-3" />
                    Click to switch server
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
