import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get("serverId");

    if (!serverId) {
      return new NextResponse("Server ID missing", { status: 400 });
    }

    const members = await db.member.findMany({
      where: {
        serverId
      },
      include: {
        profile: true
      },
      orderBy: {
        role: "asc"
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("[MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
