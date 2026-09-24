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
    const { conversationId } = req.query;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!conversationId)
      return res.status(400).json({ error: "Conversation ID Missing" });

    if (!content)
      return res.status(400).json({ error: "Content Missing" });

    // Single fast query for conversation and members with profiles
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId as string,
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

    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    const member =
      conversation.memberOne.profile.userId === userId
        ? conversation.memberOne
        : conversation.memberTwo;

    const otherMember =
      conversation.memberOne.profile.userId === userId
        ? conversation.memberTwo
        : conversation.memberOne;

    if (!member)
      return res.status(404).json({ message: "Member not found" });

    const message = await db.directMessage.create({
      data: {
        content,
        fileUrl,
        conversationId: conversationId as string,
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

    const channelKey = `chat:${conversationId}:messages`;

    // Emit message to the DM chat room immediately
    res?.socket?.server?.io?.emit(channelKey, message);

    // Emit notification targeted to recipient asynchronously
    if (res?.socket?.server?.io) {
      res.socket.server.io.emit("notification:new_message", {
        id: message.id,
        content: message.content,
        fileUrl: message.fileUrl,
        conversationId: conversationId as string,
        recipientId: otherMember.profile.userId,
        senderId: member.profile.userId,
        senderName: member.profile.name,
        senderAvatar: member.profile.imageUrl,
        type: "direct_message",
        createdAt: message.createdAt
      });
    }

    return res.status(200).json(message);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
