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

      // 5. Handle disconnection
      socket.on("disconnect", () => {
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
