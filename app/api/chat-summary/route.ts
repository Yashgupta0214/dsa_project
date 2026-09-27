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

// Built-in intelligent conversation analysis & summarizer
function generateIntelligentSummary(messages: MessageItem[], channelOrChatName: string) {
  if (!messages || messages.length === 0) {
    return {
      headline: `No messages in #${channelOrChatName}`,
      summary: "There are no recent messages in this conversation to summarize.",
      keyPoints: [],
      topicBreakdown: [],
      actionItems: [],
      participantContributions: [],
      totalMessages: 0,
      timeRange: "N/A"
    };
  }

  // Chronological order
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const startTime = new Date(sorted[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(sorted[sorted.length - 1].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const startDate = new Date(sorted[0].createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
  const timeRange = `${startDate} (${startTime} - ${endTime})`;

  // Track participant metrics & messages
  const userMap = new Map<string, { name: string; avatar?: string; messages: string[]; filesCount: number }>();

  sorted.forEach((msg) => {
    const existing = userMap.get(msg.senderName) || {
      name: msg.senderName,
      avatar: msg.senderAvatar,
      messages: [],
      filesCount: 0
    };
    if (msg.content?.trim()) {
      existing.messages.push(msg.content.trim());
    }
    if (msg.fileUrl) {
      existing.filesCount += 1;
    }
    userMap.set(msg.senderName, existing);
  });

  const participantsList = Array.from(userMap.values());
  const participantNames = participantsList.map((p) => p.name);

  // Extract action items, questions, decisions, and links
  const actionItems: string[] = [];
  const keyPoints: string[] = [];
  const linksShared: string[] = [];

  const actionKeywords = ["todo", "will do", "let's", "lets", "please", "can you", "should we", "need to", "action", "meeting", "call", "fix", "deploy", "update", "working on", "assigned"];
  const decisionKeywords = ["decided", "agreed", "done", "fixed", "completed", "approved", "confirmed", "resolved", "merged"];

  sorted.forEach((msg) => {
    const text = msg.content || "";
    const lower = text.toLowerCase();

    // Check for links
    const urlMatch = text.match(/https?:\/\/[^\s]+/g);
    if (urlMatch) {
      urlMatch.forEach((url) => {
        if (!linksShared.includes(url)) linksShared.push(url);
      });
    }

    // Check for Action Items & Decisions
    if (actionKeywords.some((k) => lower.includes(k))) {
      const cleaned = text.length > 120 ? text.slice(0, 117) + "..." : text;
      actionItems.push(`**${msg.senderName}**: ${cleaned}`);
    } else if (decisionKeywords.some((k) => lower.includes(k))) {
      const cleaned = text.length > 120 ? text.slice(0, 117) + "..." : text;
      actionItems.push(`✅ **${msg.senderName}** noted: ${cleaned}`);
    }

    // Key Highlights (messages with high substance or length)
    if (text.length > 30 || text.includes("?") || text.includes("!")) {
      if (keyPoints.length < 8) {
        keyPoints.push(`**${msg.senderName}**: "${text.length > 110 ? text.slice(0, 107) + "..." : text}"`);
      }
    }
  });

  // Generate Executive Summary
  let summaryText = "";
  if (participantsList.length === 1) {
    summaryText = `**${participantNames[0]}** posted ${sorted.length} message${sorted.length === 1 ? "" : "s"} covering recent updates and conversation topics in #${channelOrChatName}.`;
  } else {
    const topSpeakers = participantsList
      .sort((a, b) => b.messages.length - a.messages.length)
      .slice(0, 3)
      .map((p) => `**${p.name}**`)
      .join(", ");

    summaryText = `A discussion took place between ${topSpeakers}${participantsList.length > 3 ? ` and ${participantsList.length - 3} others` : ""} covering ${sorted.length} messages. Key conversations centered around ongoing tasks, updates, and collaborative exchanges.`;
  }

  // Topic Breakdown
  const topicBreakdown: Array<{ topic: string; description: string; participants: string[] }> = [];

  // Group messages by conversational clusters
  const chunkSize = Math.max(3, Math.ceil(sorted.length / 3));
  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    const chunkParticipants = Array.from(new Set(chunk.map((m) => m.senderName)));
    const sampleMessages = chunk
      .map((m) => m.content)
      .filter(Boolean)
      .slice(0, 3)
      .join(" • ");

    const topicTitle =
      i === 0
        ? "Initial Discussion & Overview"
        : i + chunkSize >= sorted.length
        ? "Recent Updates & Concluding Remarks"
        : "Main Discussion & Collaboration";

    topicBreakdown.push({
      topic: topicTitle,
      description: sampleMessages.length > 180 ? sampleMessages.slice(0, 177) + "..." : sampleMessages || "Shared updates and reactions.",
      participants: chunkParticipants
    });
  }

  // Individual Participant Contributions
  const participantContributions = participantsList.map((p) => {
    const latestMsg = p.messages[p.messages.length - 1] || "Active in chat";
    const sample = latestMsg.length > 80 ? latestMsg.slice(0, 77) + "..." : latestMsg;

    return {
      name: p.name,
      avatar: p.avatar,
      messageCount: p.messages.length + p.filesCount,
      summary: `Contributed ${p.messages.length} message${p.messages.length === 1 ? "" : "s"}${p.filesCount > 0 ? ` and ${p.filesCount} file(s)` : ""}. Last said: "${sample}"`
    };
  });

  return {
    headline: `Catch-Up Summary for #${channelOrChatName}`,
    summary: summaryText,
    keyPoints: keyPoints.slice(0, 6),
    topicBreakdown,
    actionItems: actionItems.slice(0, 6),
    linksShared: linksShared.slice(0, 5),
    participantContributions,
    totalMessages: sorted.length,
    timeRange
  };
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { channelId, conversationId, limit = 50, timeframe = "all" } = body || {};

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

      const takeCount = Math.min(Number(limit) || 50, 100);

      // Date filtering if requested
      let createdAtFilter: any = undefined;
      if (timeframe === "1h") {
        createdAtFilter = { gte: new Date(Date.now() - 60 * 60 * 1000) };
      } else if (timeframe === "today" || timeframe === "24h") {
        createdAtFilter = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      }

      const dbMessages = await db.message.findMany({
        where: {
          channelId,
          deleted: false,
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
        },
        take: takeCount,
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

      const takeCount = Math.min(Number(limit) || 50, 100);

      const dbDMs = await db.directMessage.findMany({
        where: {
          conversationId,
          deleted: false
        },
        take: takeCount,
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

    // Generate comprehensive summary
    const summaryData = generateIntelligentSummary(rawMessages, chatName);

    return NextResponse.json(summaryData);
  } catch (error) {
    console.error("[CHAT_SUMMARY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
