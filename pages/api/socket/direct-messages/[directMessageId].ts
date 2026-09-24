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
    const { directMessageId, conversationId } = req.query;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!conversationId)
      return res.status(400).json({ error: "Conversation ID Missing" });

    // Single fast query for direct message and relation check
    const existingDirectMessage = await db.directMessage.findFirst({
      where: {
        id: directMessageId as string,
        conversationId: conversationId as string,
        conversation: {
          OR: [
            { memberOne: { profile: { userId } } },
            { memberTwo: { profile: { userId } } }
          ]
        }
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!existingDirectMessage || existingDirectMessage.deleted)
      return res.status(404).json({ error: "Message not found" });

    const isMessageOwner = existingDirectMessage.member.profile.userId === userId;
    const isAdmin = existingDirectMessage.member.role === MemberRole.ADMIN;
    const isModerator = existingDirectMessage.member.role === MemberRole.MODERATOR;
    const isPinAction = typeof req.body.pinned === "boolean";
    const canModify = isPinAction ? true : (isMessageOwner || isAdmin || isModerator);

    if (!canModify) return res.status(401).json({ error: "Unauthorized" });

    let directMessage;

    if (req.method === "DELETE") {
      directMessage = await db.directMessage.update({
        where: {
          id: directMessageId as string
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

      directMessage = await db.directMessage.update({
        where: {
          id: directMessageId as string
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

    const updateKey = `chat:${conversationId}:messages:update`;
    const pinKey = `chat:${conversationId}:pins:update`;

    res?.socket?.server?.io?.emit(updateKey, directMessage);
    res?.socket?.server?.io?.emit(pinKey, directMessage);

    return res.status(200).json(directMessage);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_ID]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
