import { NextResponse } from "next/server";
import { ChannelType, MemberRole } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });
    if (!serverId)
      return new NextResponse("Server ID is Missing", { status: 400 });

    const channels = await db.channel.findMany({
      where: {
        serverId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error("[CHANNELS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { name, type } = await req.json();
    const { searchParams } = new URL(req.url);

    const serverId = searchParams.get("serverId");

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!serverId)
      return new NextResponse("Server ID is Missing", { status: 400 });

    if (name.toLowerCase() === "general")
      return new NextResponse("Name cannot be 'general'", { status: 400 });

    const member = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
        role: {
          in: [MemberRole.ADMIN, MemberRole.MODERATOR]
        }
      }
    });

    if (!member) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const sanitizedName =
      type === ChannelType.TEXT
        ? name.trim().toLowerCase().replace(/\s+/g, "-")
        : name.trim();

    const channel = await db.channel.create({
      data: {
        profileId: profile.id,
        serverId,
        name: sanitizedName,
        type: type || ChannelType.TEXT
      }
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("[CHANNELS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
