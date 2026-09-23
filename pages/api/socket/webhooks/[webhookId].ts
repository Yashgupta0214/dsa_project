import { NextApiRequest } from "next";
import { NextApiResponseServerIo } from "@/types";
import { db } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIo
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { webhookId, token: queryToken } = req.query;

    if (!webhookId || typeof webhookId !== "string") {
      return res.status(400).json({ error: "Webhook ID Missing" });
    }

    // Extract authorization token from headers or query params
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : undefined;
    const providedToken = (queryToken as string) || bearerToken;

    // Look up webhook in database
    const webhook = await (db as any).webhook.findUnique({
      where: {
        id: webhookId
      },
      include: {
        channel: true,
        server: {
          include: {
            members: {
              include: {
                profile: true
              }
            }
          }
        },
        profile: true
      }
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // If token validation is required and token was set
    if (webhook.token && providedToken && webhook.token !== providedToken) {
      return res.status(401).json({ error: "Invalid Webhook Token" });
    }

    // Parse body payload (supports Discord webhook payload structure { content, username, avatar_url } & general { text, message })
    const body = req.body || {};
    const rawContent = body.content || body.text || body.message;
    const customUsername = body.username || webhook.name || "Incoming Webhook";
    const customAvatar =
      body.avatar_url || body.avatarUrl || webhook.avatarUrl || webhook.profile.imageUrl;

    if (!rawContent && !body.embeds && !body.fileUrl) {
      return res.status(400).json({
        error: "Content, embeds or fileUrl is required in request body"
      });
    }

    // Format message content with webhook identity header if custom username provided
    const formattedContent =
      customUsername !== webhook.profile.name
        ? `🤖 **${customUsername}** [BOT]\n${rawContent || ""}`
        : rawContent || "";

    // Find the member for this webhook or first available admin member
    let member = webhook.server.members.find(
      (m: any) => m.profileId === webhook.profileId
    );

    if (!member && webhook.server.members.length > 0) {
      member = webhook.server.members[0];
    }

    if (!member) {
      return res.status(500).json({ error: "No server member available for webhook" });
    }

    const message = await db.message.create({
      data: {
        content: formattedContent,
        fileUrl: body.fileUrl || null,
        channelId: webhook.channelId,
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

    const channelKey = `chat:${webhook.channelId}:messages`;

    // Emit message to channel room
    res?.socket?.server?.io?.emit(channelKey, message);

    // Broadcast device push notification to all users
    res?.socket?.server?.io?.emit("notification:new_message", {
      id: message.id,
      content: rawContent || "Received external webhook alert",
      fileUrl: message.fileUrl,
      channelId: webhook.channelId,
      channelName: webhook.channel.name,
      serverId: webhook.serverId,
      serverName: webhook.server.name,
      senderId: `webhook_${webhook.id}`,
      senderName: customUsername,
      senderAvatar: customAvatar,
      type: "webhook",
      createdAt: message.createdAt
    });

    return res.status(200).json({
      success: true,
      messageId: message.id,
      channel: webhook.channel.name,
      server: webhook.server.name
    });
  } catch (error) {
    console.error("[WEBHOOK_POST]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

