import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(
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
            profileId: profile.id
          }
        }
      }
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    const webhooks = await (db as any).webhook.findMany({
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

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("[WEBHOOKS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const profile = await currentProfile();
    const { name, channelId, avatarUrl } = await req.json();

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!params.serverId) {
      return new NextResponse("Server ID Missing", { status: 400 });
    }

    if (!name || !channelId) {
      return new NextResponse("Name and Channel ID are required", {
        status: 400
      });
    }

    // Verify member has ADMIN or MODERATOR role
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
      }
    });

    if (!server) {
      return new NextResponse("Forbidden - Admin or Moderator only", {
        status: 403
      });
    }

    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        serverId: params.serverId
      }
    });

    if (!channel) {
      return new NextResponse("Channel not found in server", { status: 404 });
    }

    const webhook = await (db as any).webhook.create({
      data: {
        name,
        avatarUrl: avatarUrl || profile.imageUrl,
        channelId,
        serverId: params.serverId,
        profileId: profile.id
      },
      include: {
        channel: true,
        profile: true
      }
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("[WEBHOOKS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

