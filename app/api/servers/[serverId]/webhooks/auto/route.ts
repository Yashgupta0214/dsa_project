import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!params.serverId) {
      return new NextResponse("Server ID Missing", { status: 400 });
    }

    const server = await db.server.findFirst({
      where: {
        id: params.serverId,
        members: {
          some: {
            profileId: profile.id,
            role: {
              in: [MemberRole.ADMIN, MemberRole.MODERATOR]
            }
          }
        }
      },
      include: {
        channels: true
      }
    });

    if (!server) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const createdWebhooks = [];

    for (const channel of server.channels) {
      const existing = await (db as any).webhook.findFirst({
        where: {
          serverId: server.id,
          channelId: channel.id
        }
      });

      if (!existing) {
        const wh = await (db as any).webhook.create({
          data: {
            name: `${channel.name.toUpperCase()} Alerts`,
            avatarUrl: server.imageUrl || profile.imageUrl,
            serverId: server.id,
            channelId: channel.id,
            profileId: profile.id
          },
          include: {
            channel: true,
            profile: true
          }
        });
        createdWebhooks.push(wh);
      }
    }

    const allWebhooks = await (db as any).webhook.findMany({
      where: {
        serverId: params.serverId
      },
      include: {
        channel: true,
        profile: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      createdCount: createdWebhooks.length,
      webhooks: allWebhooks
    });
  } catch (error) {
    console.error("[AUTO_WEBHOOKS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

