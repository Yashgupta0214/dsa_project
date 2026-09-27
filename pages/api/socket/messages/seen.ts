import { NextApiRequest } from "next";
import { getAuth } from "@clerk/nextjs/server";

import { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    let channelId = req.query.channelId as string;
    if (!channelId && req.body) {
      if (typeof req.body === "string") {
        try {
          channelId = JSON.parse(req.body).channelId;
        } catch {}
      } else {
        channelId = req.body.channelId;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!channelId) {
      return res.status(400).json({ error: "Channel ID Missing" });
    }

    // Find member for this channel's server
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: {
                profile: { userId }
              },
              include: {
                profile: true
              }
            }
          }
        }
      }
    });

    if (!channel || !channel.server.members[0]) {
      return res.status(404).json({ error: "Member or Channel not found" });
    }

    const currentMember = channel.server.members[0];

    // Find the latest messages in channel not sent by current member that don't have receipt
    const unreadMessages = await db.message.findMany({
      where: {
        channelId,
        memberId: { not: currentMember.id },
        deleted: false,
        readReceipts: {
          none: {
            memberId: currentMember.id
          }
        }
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    if (unreadMessages.length === 0) {
      return res.status(200).json({ count: 0 });
    }

    const now = new Date();
    const messageIds = unreadMessages.map((m) => m.id);

    // Create read receipts in parallel or batch
    await Promise.all(
      messageIds.map((messageId) =>
        db.messageReadReceipt.upsert({
          where: {
            messageId_memberId: {
              messageId,
              memberId: currentMember.id
            }
          },
          update: {
            readAt: now
          },
          create: {
            messageId,
            memberId: currentMember.id,
            readAt: now
          }
        })
      )
    );

    // Broadcast over Socket.io
    if (res?.socket?.server?.io) {
      const updateKey = `chat:${channelId}:messages:update`;
      res.socket.server.io.emit(updateKey, {
        type: "CHANNEL_MESSAGES_READ",
        channelId,
        messageIds,
        readReceipt: {
          memberId: currentMember.id,
          member: currentMember,
          readAt: now.toISOString()
        }
      });
    }

    return res.status(200).json({ count: messageIds.length, readAt: now });
  } catch (error) {
    console.error("[MESSAGES_SEEN_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
