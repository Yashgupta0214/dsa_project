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
    let conversationId = req.query.conversationId as string;
    if (!conversationId && req.body) {
      if (typeof req.body === "string") {
        try {
          conversationId = JSON.parse(req.body).conversationId;
        } catch {}
      } else {
        conversationId = req.body.conversationId;
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID Missing" });
    }

    // Verify conversation membership
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
        OR: [
          { memberOne: { profile: { userId } } },
          { memberTwo: { profile: { userId } } }
        ]
      },
      include: {
        memberOne: { include: { profile: true } },
        memberTwo: { include: { profile: true } }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const currentMember =
      conversation.memberOne.profile.userId === userId
        ? conversation.memberOne
        : conversation.memberTwo;

    const now = new Date();

    // Mark all unread messages sent by the other member as seen
    const updated = await db.directMessage.updateMany({
      where: {
        conversationId: conversationId as string,
        memberId: { not: currentMember.id },
        seen: false
      },
      data: {
        seen: true,
        seenAt: now
      }
    });

    // Broadcast seen event in real-time over Socket.io to the conversation channel
    if (res?.socket?.server?.io) {
      const updateKey = `chat:${conversationId}:messages:seen`;
      res.socket.server.io.emit(updateKey, {
        conversationId: conversationId as string,
        seenByMemberId: currentMember.id,
        seenAt: now
      });

      // Also trigger general conversation query cache invalidation key
      const queryUpdateKey = `chat:${conversationId}:messages:update`;
      res.socket.server.io.emit(queryUpdateKey, {
        conversationId: conversationId as string,
        type: "SEEN_ALL",
        seenAt: now
      });
    }

    return res.status(200).json({ count: updated.count, seenAt: now });
  } catch (error) {
    console.error("[DIRECT_MESSAGES_SEEN_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
