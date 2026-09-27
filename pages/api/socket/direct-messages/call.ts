import { NextApiRequest } from "next";
import { getAuth } from "@clerk/nextjs/server";

import { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = getAuth(req);
    const {
      conversationId,
      serverId,
      action = "initiate", // "initiate" | "cancel" | "decline" | "accept"
      isVideo = true
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID Missing" });
    }

    // Find conversation and participants
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { memberOne: { profile: { userId } } },
          { memberTwo: { profile: { userId } } }
        ]
      },
      include: {
        memberOne: {
          include: { profile: true }
        },
        memberTwo: {
          include: { profile: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const currentMember =
      conversation.memberOne.profile.userId === userId
        ? conversation.memberOne
        : conversation.memberTwo;

    const otherMember =
      conversation.memberOne.profile.userId === userId
        ? conversation.memberTwo
        : conversation.memberOne;

    const targetServerId = serverId || currentMember.serverId;
    const callUrl = targetServerId
      ? `/servers/${targetServerId}/conversations/${currentMember.id}?video=true`
      : `/direct-messages/${currentMember.id}?video=true`;

    const io = res?.socket?.server?.io;

    if (action === "initiate") {
      const payload = {
        callId: `call_${conversation.id}_${Date.now()}`,
        conversationId: conversation.id,
        serverId: targetServerId,
        callUrl,
        isVideo: Boolean(isVideo),
        caller: {
          userId: currentMember.profile.userId,
          profileId: currentMember.profile.id,
          memberId: currentMember.id,
          name: currentMember.profile.name,
          imageUrl: currentMember.profile.imageUrl
        },
        recipient: {
          userId: otherMember.profile.userId,
          profileId: otherMember.profile.id,
          memberId: otherMember.id,
          name: otherMember.profile.name,
          imageUrl: otherMember.profile.imageUrl
        },
        createdAt: Date.now()
      };

      if (io) {
        io.to(`user:${otherMember.profile.userId}`).emit("call:incoming", payload);
        io.to(`user:${otherMember.profile.id}`).emit("call:incoming", payload);
        io.emit("call:incoming", payload);
      }

      return res.status(200).json(payload);
    }

    if (action === "cancel") {
      const cancelPayload = {
        conversationId: conversation.id,
        callerUserId: currentMember.profile.userId,
        recipientUserId: otherMember.profile.userId
      };

      if (io) {
        io.emit("call:cancelled", cancelPayload);
      }

      return res.status(200).json({ success: true, action: "cancel" });
    }

    if (action === "decline") {
      const declinePayload = {
        conversationId: conversation.id,
        callerUserId: otherMember.profile.userId,
        recipientUserId: currentMember.profile.userId
      };

      if (io) {
        io.emit("call:declined", declinePayload);
      }

      return res.status(200).json({ success: true, action: "decline" });
    }

    if (action === "accept") {
      const acceptPayload = {
        conversationId: conversation.id,
        callerUserId: otherMember.profile.userId,
        recipientUserId: currentMember.profile.userId
      };

      if (io) {
        io.emit("call:accepted", acceptPayload);
      }

      return res.status(200).json({ success: true, action: "accept" });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("[DIRECT_MESSAGES_CALL_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
