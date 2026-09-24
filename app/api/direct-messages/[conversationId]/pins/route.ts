import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.conversationId) {
      return new NextResponse("Conversation ID Missing", { status: 400 });
    }

    const now = new Date();

    const pinnedMessages = await db.directMessage.findMany({
      where: {
        conversationId: params.conversationId,
        deleted: false,
        pinned: true,
        OR: [
          { pinExpiresAt: null },
          { pinExpiresAt: { gt: now } }
        ]
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        pinnedAt: "desc"
      }
    });

    return NextResponse.json(pinnedMessages);
  } catch (error) {
    console.error("[DM_PINS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
