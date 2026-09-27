import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId } = await req.json();

    if (!conversationId) {
      return new NextResponse("Conversation ID Missing", { status: 400 });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { memberOne: { profileId: profile.id } },
          { memberTwo: { profileId: profile.id } }
        ]
      },
      include: {
        memberOne: true,
        memberTwo: true
      }
    });

    if (!conversation) {
      return new NextResponse("Conversation not found", { status: 404 });
    }

    const currentMember =
      conversation.memberOne.profileId === profile.id
        ? conversation.memberOne
        : conversation.memberTwo;

    const now = new Date();

    const updated = await db.directMessage.updateMany({
      where: {
        conversationId,
        memberId: { not: currentMember.id },
        seen: false
      },
      data: {
        seen: true,
        seenAt: now
      }
    });

    return NextResponse.json({ count: updated.count, seenAt: now });
  } catch (error) {
    console.error("[DIRECT_MESSAGES_SEEN_API]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
