import { NextApiRequest } from "next";
import { MemberRole } from "@prisma/client";
import { getAuth } from "@clerk/nextjs/server";

import { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "DELETE" && req.method !== "PATCH")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId } = getAuth(req);
    const { serverId, channelId, messageId } = req.query;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!serverId)
      return res.status(400).json({ error: "Server ID Missing" });

    if (!channelId)
      return res.status(400).json({ error: "Channel ID Missing" });

    // Single parallel batch to verify member and locate message
    const [member, existingMessage] = await Promise.all([
      db.member.findFirst({
        where: {
          serverId: serverId as string,
          profile: { userId }
        }
      }),
      db.message.findFirst({
        where: {
          id: messageId as string,
          channelId: channelId as string
        }
      })
    ]);

    if (!member)
      return res.status(404).json({ error: "Member not found" });

    if (!existingMessage || existingMessage.deleted)
      return res.status(404).json({ error: "Message not found" });

    const isMessageOwner = existingMessage.memberId === member.id;
    const isAdmin = member.role === MemberRole.ADMIN;
    const isModerator = member.role === MemberRole.MODERATOR;
    const isPinAction = typeof req.body.pinned === "boolean";
    const canModify = isPinAction ? true : (isMessageOwner || isAdmin || isModerator);

    if (!canModify) return res.status(401).json({ error: "Unauthorized" });

    let message;

    if (req.method === "DELETE") {
      message = await db.message.update({
        where: {
          id: messageId as string
        },
        data: {
          fileUrl: null,
          content: "This message has been deleted.",
          deleted: true,
          pinned: false,
          pinnedAt: null,
          pinExpiresAt: null
        },
        include: {
          member: {
            include: {
              profile: true
            }
          }
        }
      });
    }

    if (req.method === "PATCH") {
      const { content, pinned, pinExpiresAt } = req.body;
      const updateData: any = {};

      if (typeof pinned === "boolean") {
        updateData.pinned = pinned;
        updateData.pinnedAt = pinned ? new Date() : null;
        updateData.pinExpiresAt = pinned
          ? pinExpiresAt
            ? new Date(pinExpiresAt)
            : null
          : null;
      }

      if (typeof content === "string") {
        if (!isMessageOwner)
          return res.status(401).json({ error: "Unauthorized" });
        updateData.content = content;
      }

      message = await db.message.update({
        where: {
          id: messageId as string
        },
        data: updateData,
        include: {
          member: {
            include: {
              profile: true
            }
          }
        }
      });
    }

    const updateKey = `chat:${channelId}:messages:update`;
    const pinKey = `chat:${channelId}:pins:update`;

    res?.socket?.server?.io?.emit(updateKey, message);
    res?.socket?.server?.io?.emit(pinKey, message);

    return res.status(200).json(message);
  } catch (error) {
    console.error("[MESSAGES_ID]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
