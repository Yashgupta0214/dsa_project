import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

interface MessageItem {
  id: string;
  content: string;
  fileUrl?: string | null;
  createdAt: Date;
  senderName: string;
}

function cleanMessageContent(rawContent: string): string {
  if (!rawContent) return "";
  let cleaned = rawContent;
  // Remove reply prefixes
  cleaned = cleaned.replace(/^\[reply:\{.*?\}\]\n?/, "");
  cleaned = cleaned.replace(/^> Replying to @.*?: ".*?"\n?/, "");
  // Remove bot tags
  cleaned = cleaned.replace(/\*\*\[BOT\].*?\*\*/g, "");
  return cleaned.trim();
}

// Generates a coherent narrative passage summarizing the conversation without speaker names
function generatePassageSummary(messages: MessageItem[], chatName: string) {
  if (!messages || messages.length === 0) {
    return {
      title: `Summary for #${chatName}`,
      passage: "All caught up! There are no recent messages in this conversation to summarize.",
      totalMessages: 0
    };
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const cleanTexts: string[] = [];
  let pdfCount = 0;
  let imageCount = 0;
  let linkCount = 0;
  const links: string[] = [];
  const keyPhrases: string[] = [];

  sorted.forEach((msg) => {
    const cleaned = cleanMessageContent(msg.content);

    // Check files
    if (msg.fileUrl) {
      if (msg.fileUrl.endsWith(".pdf")) pdfCount++;
      else imageCount++;
    }

    // Check links
    const urlMatches = cleaned.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) {
      linkCount += urlMatches.length;
      urlMatches.forEach((url) => {
        if (!links.includes(url)) links.push(url);
      });
    }

    if (cleaned) {
      cleanTexts.push(cleaned);

      // Extract substantive phrases
      if (
        cleaned.length > 8 &&
        !/^(hi+|hy+|hey+|hello+|test(ing)?)$/i.test(cleaned) &&
        !cleaned.startsWith("http")
      ) {
        keyPhrases.push(cleaned);
      }
    }
  });

  // Construct a smooth narrative passage
  const sentences: string[] = [];

  // 1. Overview opening
  sentences.push(
    `The conversation covered recent updates and discussions with ${sorted.length} messages exchanged.`
  );

  // 2. Main Discussion Topics
  if (keyPhrases.length > 0) {
    // Select 2-4 representative key discussion points to construct natural summary sentences
    const samplePhrases = keyPhrases
      .slice(-4)
      .map((p) => p.replace(/[.!]$/, ""))
      .join(", ");

    sentences.push(
      `Key discussions centered around active testing, collaborative coordination, and topics including: "${samplePhrases}".`
    );
  } else {
    sentences.push(
      "Discussions consisted of check-ins, greeting exchanges, and real-time connectivity testing."
    );
  }

  // 3. Attachments & Shared Resources
  const resourceParts: string[] = [];
  if (pdfCount > 0) {
    resourceParts.push(`${pdfCount} PDF document${pdfCount > 1 ? "s" : ""}`);
  }
  if (imageCount > 0) {
    resourceParts.push(`${imageCount} image attachment${imageCount > 1 ? "s" : ""}`);
  }
  if (linkCount > 0) {
    resourceParts.push(`${linkCount} web link${linkCount > 1 ? "s" : ""} and external resources`);
  }

  if (resourceParts.length > 0) {
    sentences.push(
      `Shared materials during the session included ${resourceParts.join(" as well as ")}.`
    );
  }

  // 4. Closing sentence
  sentences.push(
    "Overall, the exchange ensured team alignment on ongoing workflow testing and system status."
  );

  const fullPassage = sentences.join(" ");

  return {
    title: `Summary for #${chatName}`,
    passage: fullPassage,
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
        take: 35,
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
        senderName: m.member?.profile?.name || "Member"
      }));
    } else if (conversationId) {
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
        take: 35,
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
        senderName: m.member?.profile?.name || "User"
      }));
    }

    const summaryData = generatePassageSummary(rawMessages, chatName);
    return NextResponse.json(summaryData);
  } catch (error) {
    console.error("[CHAT_SUMMARY_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
