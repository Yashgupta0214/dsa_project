import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UnreadState {
  unreadByServer: Record<string, number>;
  incrementUnread: (serverId: string) => void;
  clearUnread: (serverId: string) => void;
  setUnread: (serverId: string, count: number) => void;
  getUnread: (serverId: string) => number;
}

export const useUnreadStore = create<UnreadState>()(
  persist(
    (set, get) => ({
      unreadByServer: {},
      incrementUnread: (serverId: string) => {
        if (!serverId) return;
        set((state) => ({
          unreadByServer: {
            ...state.unreadByServer,
            [serverId]: (state.unreadByServer[serverId] || 0) + 1
          }
        }));
      },
      clearUnread: (serverId: string) => {
        if (!serverId) return;
        set((state) => {
          if (!state.unreadByServer[serverId]) return state;
          const updated = { ...state.unreadByServer };
          delete updated[serverId];
          return { unreadByServer: updated };
        });
      },
      setUnread: (serverId: string, count: number) => {
        if (!serverId) return;
        set((state) => ({
          unreadByServer: {
            ...state.unreadByServer,
            [serverId]: Math.max(0, count)
          }
        }));
      },
      getUnread: (serverId: string) => {
        return get().unreadByServer[serverId] || 0;
      }
    }),
    {
      name: "komit-server-unreads",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
