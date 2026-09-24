import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.channelId) {
      return new NextResponse("Channel ID Missing", { status: 400 });
    }

    const now = new Date();

    // Fetch all pinned messages
    const pinnedMessages = await db.message.findMany({
      where: {
        channelId: params.channelId,
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
    console.error("[CHANNEL_PINS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
