import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";

import { NextApiResponseServerIo } from "@/types";

export const config = {
  api: {
    bodyParser: false
  }
};

// Global in-memory presence tracking across connections
const onlineUsers = new Map<string, { status: string; customStatus?: string; count: number; profileId?: string; userId?: string }>();
const socketToUser = new Map<string, { profileId?: string; userId?: string }>();

// In-memory active chat viewers tracking: chatId -> Map<socketId, { id: string; name: string; imageUrl?: string }>
const chatActiveViewers = new Map<string, Map<string, { id: string; name: string; imageUrl?: string }>>();
const socketToChat = new Map<string, string>();

function getChatActivePresence(chatId: string) {
  const viewers = chatActiveViewers.get(chatId);
  if (!viewers || viewers.size === 0) {
    return { count: 1, users: [] };
  }
  const uniqueUsers = new Map<string, { id: string; name: string; imageUrl?: string }>();
  viewers.forEach((user, sId) => {
    uniqueUsers.set(user.id || sId, user);
  });
  return {
    count: Math.max(1, uniqueUsers.size),
    users: Array.from(uniqueUsers.values())
  };
}

function buildPresenceDictionary(): Record<string, { status: string; customStatus?: string }> {
  const dict: Record<string, { status: string; customStatus?: string }> = {};
  onlineUsers.forEach((value, key) => {
    if (value.status !== "invisible") {
      dict[key] = {
        status: value.status || "online",
        customStatus: value.customStatus
      };
    }
  });
  return dict;
}

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  if (!res.socket.server.io) {
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path,
      // @ts-ignore
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      // 1. Send current presence dictionary immediately on connection
      socket.emit("presence:sync", buildPresenceDictionary());

      // 2. Handle presence registration / join
      socket.on("presence:join", (data: { profileId?: string; userId?: string; status?: string; customStatus?: string }) => {
        const { profileId, userId, status = "online", customStatus } = data || {};
        if (!profileId && !userId) return;

        socketToUser.set(socket.id, { profileId, userId });

        const keysToRegister = [profileId, userId].filter(Boolean) as string[];
        keysToRegister.forEach((key) => {
          socket.join(`user:${key}`);
          const current = onlineUsers.get(key) || { count: 0, status, customStatus, profileId, userId };
          current.count = (current.count || 0) + 1;
          current.status = status;
          current.customStatus = customStatus;
          current.profileId = profileId;
          current.userId = userId;
          onlineUsers.set(key, current);
        });

        // Broadcast to all sockets
        io.emit("presence:sync", buildPresenceDictionary());
        io.emit("presence:user_online", {
          profileId,
          userId,
          status,
          customStatus
        });
      });

      // Direct User Register
      socket.on("user:register", (data: { profileId?: string; userId?: string }) => {
        const { profileId, userId } = data || {};
        if (profileId) socket.join(`user:${profileId}`);
        if (userId) socket.join(`user:${userId}`);
        socketToUser.set(socket.id, { profileId, userId });
      });

      // 3. Handle explicit presence / status update (e.g. online -> idle, dnd, invisible)
      socket.on("presence:update", (data: { profileId?: string; userId?: string; status?: string; customStatus?: string }) => {
        const { profileId, userId, status = "online", customStatus } = data || {};
        const keysToUpdate = [profileId, userId].filter(Boolean) as string[];
        keysToUpdate.forEach((key) => {
          const current = onlineUsers.get(key);
          if (current) {
            current.status = status;
            current.customStatus = customStatus;
            onlineUsers.set(key, current);
          } else {
            onlineUsers.set(key, { count: 1, status, customStatus, profileId, userId });
          }
        });

        io.emit("presence:sync", buildPresenceDictionary());
        io.emit("presence:user_update", {
          profileId,
          userId,
          status,
          customStatus
        });
      });

      // 4. Request sync
      socket.on("presence:sync_request", () => {
        socket.emit("presence:sync", buildPresenceDictionary());
      });

      // =====================================================================
      // Real-time Active Chat Participants Tracking
      // =====================================================================
      socket.on("chat:view_join", (data: { chatId: string; user?: { id: string; name: string; imageUrl?: string } }) => {
        if (!data?.chatId) return;
        const { chatId, user } = data;

        // If previously in another chat, leave that
        const prevChat = socketToChat.get(socket.id);
        if (prevChat && prevChat !== chatId) {
          const prevViewers = chatActiveViewers.get(prevChat);
          if (prevViewers) {
            prevViewers.delete(socket.id);
            if (prevViewers.size === 0) chatActiveViewers.delete(prevChat);
          }
          io.emit(`chat:${prevChat}:active_presence`, getChatActivePresence(prevChat));
        }

        socketToChat.set(socket.id, chatId);
        if (!chatActiveViewers.has(chatId)) {
          chatActiveViewers.set(chatId, new Map());
        }
        chatActiveViewers.get(chatId)!.set(socket.id, user || { id: socket.id, name: "User" });

        io.emit(`chat:${chatId}:active_presence`, getChatActivePresence(chatId));
      });

      socket.on("chat:view_leave", (data: { chatId: string }) => {
        if (!data?.chatId) return;
        const { chatId } = data;
        socketToChat.delete(socket.id);
        const viewers = chatActiveViewers.get(chatId);
        if (viewers) {
          viewers.delete(socket.id);
          if (viewers.size === 0) chatActiveViewers.delete(chatId);
        }
        io.emit(`chat:${chatId}:active_presence`, getChatActivePresence(chatId));
      });

      socket.on("chat:get_active", (data: { chatId: string }) => {
        if (!data?.chatId) return;
        socket.emit(`chat:${data.chatId}:active_presence`, getChatActivePresence(data.chatId));
      });

      // =====================================================================
      // Real-time Chat Typing Indicators
      // =====================================================================
      socket.on("chat:typing_start", (data: { chatId: string; user: { id: string; name: string }; socketId?: string }) => {
        if (!data?.chatId || !data?.user) return;
        const payload = {
          user: data.user,
          socketId: data.socketId || socket.id,
          isTyping: true
        };
        socket.broadcast.emit(`chat:${data.chatId}:typing`, payload);
      });

      socket.on("chat:typing_stop", (data: { chatId: string; user: { id: string; name: string }; socketId?: string }) => {
        if (!data?.chatId || !data?.user) return;
        const payload = {
          user: data.user,
          socketId: data.socketId || socket.id,
          isTyping: false
        };
        socket.broadcast.emit(`chat:${data.chatId}:typing`, payload);
      });

      // =====================================================================
      // Real-time Direct Calling Notifications & Signals
      // =====================================================================
      socket.on("call:initiate", (data: any) => {
        if (!data) return;
        // Forward to recipient's personal user room
        if (data.recipient?.userId) {
          io.to(`user:${data.recipient.userId}`).emit("call:incoming", data);
        }
        if (data.recipient?.profileId) {
          io.to(`user:${data.recipient.profileId}`).emit("call:incoming", data);
        }
        // Broadcast as fail-safe (recipient filters by recipient.userId === currentUserId)
        socket.broadcast.emit("call:incoming", data);
      });

      socket.on("call:cancel", (data: any) => {
        if (!data) return;
        io.emit("call:cancelled", data);
      });

      socket.on("call:decline", (data: any) => {
        if (!data) return;
        io.emit("call:declined", data);
      });

      socket.on("call:accept", (data: any) => {
        if (!data) return;
        io.emit("call:accepted", data);
      });

      // =====================================================================
      // WebRTC Multi-Peer Voice & Video Calling Signaling
      // =====================================================================
      socket.on("call:join_room", (data: { roomId: string; user: { id: string; name: string; imageUrl?: string }; mediaState: { isMuted: boolean; isVideoOff: boolean; isScreenSharing: boolean } }) => {
        const { roomId, user, mediaState } = data || {};
        if (!roomId || !user?.id) return;

        socket.join(roomId);
        (socket as any).currentCallRoom = roomId;
        (socket as any).callUser = user;
        (socket as any).mediaState = mediaState;

        // Get other participants in the room
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        const participants: Array<{ socketId: string; user: any; mediaState: any }> = [];

        if (roomSockets) {
          roomSockets.forEach((sId) => {
            if (sId !== socket.id) {
              const targetSocket = io.sockets.sockets.get(sId);
              if (targetSocket) {
                participants.push({
                  socketId: sId,
                  user: (targetSocket as any).callUser || { id: sId, name: "User" },
                  mediaState: (targetSocket as any).mediaState || { isMuted: false, isVideoOff: true, isScreenSharing: false }
                });
              }
            }
          });
        }

        // Send existing participants to the joined user
        socket.emit("call:all_participants", participants);

        // Notify other participants that a new user joined
        socket.to(roomId).emit("call:user_joined", {
          socketId: socket.id,
          user,
          mediaState
        });
      });

      // Forward WebRTC signals (Offers, Answers, ICE Candidates)
      socket.on("call:signal", (data: { to: string; signal: any }) => {
        const { to, signal } = data || {};
        if (!to || !signal) return;

        io.to(to).emit("call:signal", {
          from: socket.id,
          signal,
          user: (socket as any).callUser,
          mediaState: (socket as any).mediaState
        });
      });

      // Broadcast media state changes (Mute, Camera, Screen Share)
      socket.on("call:media_state", (data: { roomId: string; mediaState: { isMuted: boolean; isVideoOff: boolean; isScreenSharing: boolean } }) => {
        const { roomId, mediaState } = data || {};
        if (!roomId || !mediaState) return;

        (socket as any).mediaState = mediaState;
        socket.to(roomId).emit("call:user_media_state", {
          socketId: socket.id,
          mediaState
        });
      });

      // Explicitly leave call room
      socket.on("call:leave_room", (data: { roomId?: string }) => {
        const roomId = data?.roomId || (socket as any).currentCallRoom;
        if (roomId) {
          socket.leave(roomId);
          socket.to(roomId).emit("call:user_left", {
            socketId: socket.id,
            user: (socket as any).callUser
          });
          (socket as any).currentCallRoom = null;
        }
      });

      // 5. Handle disconnection
      socket.on("disconnect", () => {
        const callRoom = (socket as any).currentCallRoom;
        if (callRoom) {
          socket.to(callRoom).emit("call:user_left", {
            socketId: socket.id,
            user: (socket as any).callUser
          });
        }

        // Clean up chat view presence
        const activeChatId = socketToChat.get(socket.id);
        if (activeChatId) {
          socketToChat.delete(socket.id);
          const viewers = chatActiveViewers.get(activeChatId);
          if (viewers) {
            viewers.delete(socket.id);
            if (viewers.size === 0) {
              chatActiveViewers.delete(activeChatId);
            }
          }
          io.emit(`chat:${activeChatId}:active_presence`, getChatActivePresence(activeChatId));
        }

        const mapping = socketToUser.get(socket.id);
        if (mapping) {
          socketToUser.delete(socket.id);
          const { profileId, userId } = mapping;
          const keysToDeregister = [profileId, userId].filter(Boolean) as string[];

          let wentOffline = false;
          keysToDeregister.forEach((key) => {
            const current = onlineUsers.get(key);
            if (current) {
              current.count = Math.max(0, (current.count || 1) - 1);
              if (current.count === 0) {
                onlineUsers.delete(key);
                wentOffline = true;
              } else {
                onlineUsers.set(key, current);
              }
            }
          });

          if (wentOffline) {
            io.emit("presence:sync", buildPresenceDictionary());
            io.emit("presence:user_offline", { profileId, userId });
          }
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
