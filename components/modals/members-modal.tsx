"use client";

import React, { useState } from "react";
import {
  Check,
  Gavel,
  Loader2,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion
} from "lucide-react";
import { MemberRole } from "@prisma/client";
import qs from "query-string";
import axios from "axios";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { ServerWithMembersWithProfiles } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const roleIconMap = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-4 w-4 ml-1.5 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-4 w-4 ml-1.5 text-rose-500" />
};

export function MembersModal() {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const [loadingId, setLoadingId] = useState("");

  const router = useRouter();

  const isModalOpen = isOpen && type === "members";
  const { server } = data as { server: ServerWithMembersWithProfiles };

  const onKick = async (memberId: string) => {
    try {
      setLoadingId(memberId);

      const url = qs.stringifyUrl({
        url: `/api/members/${memberId}`,
        query: { serverId: server?.id }
      });

      const response = await axios.delete(url);

      router.refresh();
      onOpen("members", { server: response.data });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId("");
    }
  };

  const onRoleChange = async (memberId: string, role: MemberRole) => {
    try {
      setLoadingId(memberId);

      const url = qs.stringifyUrl({
        url: `/api/members/${memberId}`,
        query: { serverId: server?.id }
      });

      const response = await axios.patch(url, { role });

      router.refresh();
      onOpen("members", { server: response.data });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId("");
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-zinc-900 dark:text-zinc-100 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl p-0">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Manage Members
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            {server?.members?.length} {server?.members?.length === 1 ? "Member" : "Members"} in this server
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4 max-h-[420px] px-6 pb-6">
          <div className="space-y-3">
            {server?.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-x-3 p-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition"
              >
                <UserAvatar
                  src={member.profile.imageUrl}
                  className="ring-1 ring-black/5 dark:ring-white/10"
                />
                <div className="flex flex-col gap-y-0.5">
                  <div className="text-sm font-semibold flex items-center tracking-tight text-zinc-800 dark:text-zinc-100">
                    {member.profile.name}
                    {roleIconMap[member.role]}
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {member.profile.email}
                  </p>
                </div>
                {server.profileId !== member.profileId &&
                  loadingId !== member.id && (
                    <div className="ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition focus:outline-none">
                          <MoreVertical className="h-4 w-4 text-zinc-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="left"
                          className="bg-white dark:bg-[#18191c] border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-1 text-xs"
                        >
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center rounded-lg cursor-pointer">
                              <ShieldQuestion className="w-4 h-4 mr-2" />
                              <span>Role</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="bg-white dark:bg-[#18191c] border border-black/10 dark:border-white/10 rounded-xl shadow-xl p-1 text-xs">
                                <DropdownMenuItem
                                  onClick={() => onRoleChange(member.id, "GUEST")}
                                  className="rounded-lg cursor-pointer"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Guest
                                  {member.role === "GUEST" && (
                                    <Check className="h-4 w-4 ml-auto text-indigo-500" />
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    onRoleChange(member.id, "MODERATOR")
                                  }
                                  className="rounded-lg cursor-pointer"
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2 text-indigo-500" />
                                  Moderator
                                  {member.role === "MODERATOR" && (
                                    <Check className="h-4 w-4 ml-auto text-indigo-500" />
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                          <DropdownMenuItem
                            onClick={() => onKick(member.id)}
                            className="rounded-lg cursor-pointer text-rose-500 hover:bg-rose-500/10 transition"
                          >
                            <Gavel className="h-4 w-4 mr-2" />
                            Kick
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                {loadingId === member.id && (
                  <Loader2 className="animate-spin text-zinc-400 ml-auto w-4 h-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
