import { create } from "zustand";
import { Channel, ChannelType, Profile, Server } from "@prisma/client";

export type ModalType =
  | "createServer"
  | "invite"
  | "editServer"
  | "members"
  | "createChannel"
  | "leaveServer"
  | "deleteServer"
  | "deleteChannel"
  | "editChannel"
  | "messageFile"
  | "deleteMessage"
  | "pinMessage"
  | "joinServer"
  | "searchServers"
  | "editProfile"
  | "userSettings"
  | "messageSeenBy";

interface ModalData {
  server?: Server;
  serverId?: string;
  servers?: Server[];
  channel?: Channel;
  channelType?: ChannelType;
  profile?: Profile;
  apiUrl?: string;
  query?: Record<string, any>;
  message?: {
    id: string;
    content: string;
    fileUrl?: string | null;
    member?: {
      profile?: {
        name?: string;
        imageUrl?: string;
      };
    };
    pinned?: boolean;
    pinnedAt?: string | null;
    pinExpiresAt?: string | null;
  };
  seenData?: {
    messageId: string;
    content: string;
    timestamp: string;
    isDM: boolean;
    seen?: boolean;
    seenAt?: string | null;
    recipientName?: string;
    recipientAvatar?: string;
    readReceipts?: Array<{
      memberId: string;
      readAt: string | Date;
      member?: {
        role?: string;
        profile?: {
          name?: string;
          imageUrl?: string;
        };
      };
    }>;
  };
  socketUrl?: string;
  socketQuery?: Record<string, string>;
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ isOpen: false, type: null })
}));
