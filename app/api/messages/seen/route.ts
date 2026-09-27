import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId } = await req.json();
    if (!channelId) {
      return new NextResponse("Channel ID Missing", { status: 400 });
    }

    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: {
                profileId: profile.id
              }
            }
          }
        }
      }
    });

    if (!channel || !channel.server.members[0]) {
      return new NextResponse("Channel or Member not found", { status: 404 });
    }

    const currentMember = channel.server.members[0];

    const unreadMessages = await db.message.findMany({
      where: {
        channelId,
        memberId: { not: currentMember.id },
        deleted: false,
        readReceipts: {
          none: {
            memberId: currentMember.id
          }
        }
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    if (unreadMessages.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const now = new Date();
    const messageIds = unreadMessages.map((m) => m.id);

    await Promise.all(
      messageIds.map((messageId) =>
        db.messageReadReceipt.upsert({
          where: {
            messageId_memberId: {
              messageId,
              memberId: currentMember.id
            }
          },
          update: {
            readAt: now
          },
          create: {
            messageId,
            memberId: currentMember.id,
            readAt: now
          }
        })
      )
    );

    return NextResponse.json({ count: messageIds.length, readAt: now });
  } catch (error) {
    console.error("[MESSAGES_SEEN_API]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
