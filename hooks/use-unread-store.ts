import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UnreadState {
  unreadByServer: Record<string, number>;
  unreadByChannel: Record<string, number>;
  unreadByMember: Record<string, number>;
  unreadByConversation: Record<string, number>;

  // Server actions
  incrementServerUnread: (serverId: string) => void;
  clearServerUnread: (serverId: string) => void;
  setServerUnread: (serverId: string, count: number) => void;
  getServerUnread: (serverId: string) => number;

  // Channel (Group Chat) actions
  incrementChannelUnread: (channelId: string) => void;
  clearChannelUnread: (channelId: string) => void;
  setChannelUnread: (channelId: string, count: number) => void;
  getChannelUnread: (channelId: string) => number;

  // Member / Direct Message actions
  incrementMemberUnread: (memberOrProfileId: string) => void;
  clearMemberUnread: (memberOrProfileId: string) => void;
  setMemberUnread: (memberOrProfileId: string, count: number) => void;
  getMemberUnread: (memberOrProfileId: string) => number;

  // Conversation actions
  incrementConversationUnread: (conversationId: string) => void;
  clearConversationUnread: (conversationId: string) => void;
  setConversationUnread: (conversationId: string, count: number) => void;
  getConversationUnread: (conversationId: string) => number;

  // Backwards compatibility aliases
  incrementUnread: (serverId: string) => void;
  clearUnread: (serverId: string) => void;
  setUnread: (serverId: string, count: number) => void;
  getUnread: (serverId: string) => number;
}

export const useUnreadStore = create<UnreadState>()(
  persist(
    (set, get) => ({
      unreadByServer: {},
      unreadByChannel: {},
      unreadByMember: {},
      unreadByConversation: {},

      // Server
      incrementServerUnread: (serverId: string) => {
        if (!serverId) return;
        set((state) => ({
          unreadByServer: {
            ...state.unreadByServer,
            [serverId]: (state.unreadByServer[serverId] || 0) + 1
          }
        }));
      },
      clearServerUnread: (serverId: string) => {
        if (!serverId) return;
        set((state) => {
          if (!state.unreadByServer[serverId]) return state;
          const updated = { ...state.unreadByServer };
          delete updated[serverId];
          return { unreadByServer: updated };
        });
      },
      setServerUnread: (serverId: string, count: number) => {
        if (!serverId) return;
        set((state) => ({
          unreadByServer: {
            ...state.unreadByServer,
            [serverId]: Math.max(0, count)
          }
        }));
      },
      getServerUnread: (serverId: string) => {
        return get().unreadByServer[serverId] || 0;
      },

      // Channel
      incrementChannelUnread: (channelId: string) => {
        if (!channelId) return;
        set((state) => ({
          unreadByChannel: {
            ...state.unreadByChannel,
            [channelId]: (state.unreadByChannel[channelId] || 0) + 1
          }
        }));
      },
      clearChannelUnread: (channelId: string) => {
        if (!channelId) return;
        set((state) => {
          if (!state.unreadByChannel[channelId]) return state;
          const updated = { ...state.unreadByChannel };
          delete updated[channelId];
          return { unreadByChannel: updated };
        });
      },
      setChannelUnread: (channelId: string, count: number) => {
        if (!channelId) return;
        set((state) => ({
          unreadByChannel: {
            ...state.unreadByChannel,
            [channelId]: Math.max(0, count)
          }
        }));
      },
      getChannelUnread: (channelId: string) => {
        return get().unreadByChannel[channelId] || 0;
      },

      // Member (DM)
      incrementMemberUnread: (memberOrProfileId: string) => {
        if (!memberOrProfileId) return;
        set((state) => ({
          unreadByMember: {
            ...state.unreadByMember,
            [memberOrProfileId]: (state.unreadByMember[memberOrProfileId] || 0) + 1
          }
        }));
      },
      clearMemberUnread: (memberOrProfileId: string) => {
        if (!memberOrProfileId) return;
        set((state) => {
          if (!state.unreadByMember[memberOrProfileId]) return state;
          const updated = { ...state.unreadByMember };
          delete updated[memberOrProfileId];
          return { unreadByMember: updated };
        });
      },
      setMemberUnread: (memberOrProfileId: string, count: number) => {
        if (!memberOrProfileId) return;
        set((state) => ({
          unreadByMember: {
            ...state.unreadByMember,
            [memberOrProfileId]: Math.max(0, count)
          }
        }));
      },
      getMemberUnread: (memberOrProfileId: string) => {
        return get().unreadByMember[memberOrProfileId] || 0;
      },

      // Conversation
      incrementConversationUnread: (conversationId: string) => {
        if (!conversationId) return;
        set((state) => ({
          unreadByConversation: {
            ...state.unreadByConversation,
            [conversationId]: (state.unreadByConversation[conversationId] || 0) + 1
          }
        }));
      },
      clearConversationUnread: (conversationId: string) => {
        if (!conversationId) return;
        set((state) => {
          if (!state.unreadByConversation[conversationId]) return state;
          const updated = { ...state.unreadByConversation };
          delete updated[conversationId];
          return { unreadByConversation: updated };
        });
      },
      setConversationUnread: (conversationId: string, count: number) => {
        if (!conversationId) return;
        set((state) => ({
          unreadByConversation: {
            ...state.unreadByConversation,
            [conversationId]: Math.max(0, count)
          }
        }));
      },
      getConversationUnread: (conversationId: string) => {
        return get().unreadByConversation[conversationId] || 0;
      },

      // Aliases
      incrementUnread: (serverId: string) => get().incrementServerUnread(serverId),
      clearUnread: (serverId: string) => get().clearServerUnread(serverId),
      setUnread: (serverId: string, count: number) => get().setServerUnread(serverId, count),
      getUnread: (serverId: string) => get().getServerUnread(serverId)
    }),
    {
      name: "komit-unread-storage",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
