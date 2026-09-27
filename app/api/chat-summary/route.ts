import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

interface MessageItem {
  id: string;
  content: string;
  fileUrl?: string | null;
  createdAt: Date;
  senderName: string;
  senderAvatar?: string;
}

function cleanMessageText(rawContent: string, fileUrl?: string | null): string {
  if (!rawContent && fileUrl) {
    const isPDF = fileUrl.endsWith(".pdf");
    return isPDF ? "shared a PDF document" : "shared an image / attachment";
  }

  if (!rawContent) return "";

  let cleaned = rawContent;

  // Remove [reply:{...}] prefix
  cleaned = cleaned.replace(/^\[reply:\{.*?\}\]\n?/, "");

  // Remove > Replying to @Name: "..." prefix
  cleaned = cleaned.replace(/^> Replying to @.*?: ".*?"\n?/, "");

  // If content is just a file path
  if (cleaned.startsWith("/uploads/") || cleaned.startsWith("http") && (cleaned.endsWith(".pdf") || cleaned.endsWith(".png") || cleaned.endsWith(".jpg"))) {
    return "shared an attachment file";
  }

  // Remove bot/webhook markup noise
  cleaned = cleaned.replace(/\*\*\[BOT\].*?\*\*/g, "").trim();

  return cleaned.trim();
}

function generateCleanSummary(messages: MessageItem[], chatName: string) {
  if (!messages || messages.length === 0) {
    return {
      title: `Summary for #${chatName}`,
      summaryPoints: ["All caught up! No recent messages to summarize."],
      totalMessages: 0
    };
  }

  // Chronological order
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group messages by sender
  const userMessages = new Map<string, string[]>();

  sorted.forEach((msg) => {
    const text = cleanMessageText(msg.content, msg.fileUrl);
    if (!text) return;

    const list = userMessages.get(msg.senderName) || [];
    list.push(text);
    userMessages.set(msg.senderName, list);
  });

  const summaryPoints: string[] = [];

  // Create clear, natural bullet points for what each person talked about
  userMessages.forEach((msgs, sender) => {
    // Filter out very short greetings like "hii", "Hyy", "hhiiiii" into a clean recap if they have real messages
    const meaningful = msgs.filter((m) => m.length > 5 && !/^(hi+|hy+|hey+|hello+|test(ing)?)$/i.test(m));

    if (meaningful.length > 0) {
      // Pick the top meaningful notes
      const sample = meaningful.slice(-2).join("; ");
      const truncated = sample.length > 130 ? sample.slice(0, 127) + "..." : sample;
      summaryPoints.push(`**${sender}**: ${truncated}`);
    } else {
      summaryPoints.push(`**${sender}**: Active in chat (${msgs.length} message${msgs.length === 1 ? "" : "s"}).`);
    }
  });

  // Limit to top 5 concise points
  const points = summaryPoints.slice(0, 5);
  if (points.length === 0) {
    points.push(`Recent messages exchanged between ${Array.from(userMessages.keys()).join(", ")}.`);
  }

  return {
    title: `Summary for #${chatName}`,
    summaryPoints: points,
    totalMessages: sorted.length
  };
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { channelId, conversationId } = body || {};

    if (!channelId && !conversationId) {
      return new NextResponse("Channel ID or Conversation ID required", { status: 400 });
    }

    let rawMessages: MessageItem[] = [];
    let chatName = "chat";

    // 1. Channel Messages
    if (channelId) {
      const channel = await db.channel.findUnique({
        where: { id: channelId }
      });
      chatName = channel?.name || "channel";

      const dbMessages = await db.message.findMany({
        where: {
          channelId,
          deleted: false
        },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          member: {
            include: {
              profile: true
            }
          }
        }
      });

      rawMessages = dbMessages.map((m) => ({
        id: m.id,
        content: m.content,
        fileUrl: m.fileUrl,
        createdAt: m.createdAt,
        senderName: m.member?.profile?.name || "Member",
        senderAvatar: m.member?.profile?.imageUrl || undefined
      }));
    }
    // 2. Direct Messages
    else if (conversationId) {
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: {
          memberOne: { include: { profile: true } },
          memberTwo: { include: { profile: true } }
        }
      });

      const otherMember =
        conversation?.memberOne.profileId === profile.id
          ? conversation?.memberTwo
          : conversation?.memberOne;

      chatName = otherMember?.profile?.name || "Direct Message";

      const dbDMs = await db.directMessage.findMany({
        where: {
          conversationId,
          deleted: false
        },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          member: {
            include: {
              profile: true
            }
          }
        }
      });

      rawMessages = dbDMs.map((m) => ({
        id: m.id,
        content: m.content,
        fileUrl: m.fileUrl,
        createdAt: m.createdAt,
        senderName: m.member?.profile?.name || "User",
        senderAvatar: m.member?.profile?.imageUrl || undefined
      }));
    }

    const summaryData = generateCleanSummary(rawMessages, chatName);

    return NextResponse.json(summaryData);
  } catch (error) {
    console.error("[CHAT_SUMMARY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
