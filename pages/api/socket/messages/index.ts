import { NextApiRequest } from "next";
import { getAuth } from "@clerk/nextjs/server";

import { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId } = getAuth(req);
    const { content, fileUrl } = req.body;
    const { serverId, channelId } = req.query;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!serverId)
      return res.status(400).json({ error: "Server ID Missing" });

    if (!channelId)
      return res.status(400).json({ error: "Channel ID Missing" });

    if (!content)
      return res.status(400).json({ error: "Content Missing" });

    // Parallel lookup for member verification and channel data in a single batch
    const [member, channel] = await Promise.all([
      db.member.findFirst({
        where: {
          serverId: serverId as string,
          profile: {
            userId
          }
        },
        include: {
          profile: true
        }
      }),
      db.channel.findFirst({
        where: {
          id: channelId as string,
          serverId: serverId as string
        },
        include: {
          server: true
        }
      })
    ]);

    if (!member)
      return res.status(404).json({ message: "Member not found" });

    if (!channel)
      return res.status(404).json({ message: "Channel not found" });

    const message = await db.message.create({
      data: {
        content,
        fileUrl,
        channelId: channelId as string,
        memberId: member.id
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });

    const channelKey = `chat:${channelId}:messages`;

    // Emit message to current channel room immediately
    res?.socket?.server?.io?.emit(channelKey, message);

    // Emit global notification asynchronously without blocking response
    if (res?.socket?.server?.io) {
      res.socket.server.io.emit("notification:new_message", {
        id: message.id,
        content: message.content,
        fileUrl: message.fileUrl,
        channelId: channelId as string,
        channelName: channel.name,
        serverId: serverId as string,
        serverName: channel.server.name,
        senderId: member.profile.userId,
        senderName: member.profile.name,
        senderAvatar: member.profile.imageUrl,
        type: "channel",
        createdAt: message.createdAt
      });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
