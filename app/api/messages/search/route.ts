import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const channelId = searchParams.get("channelId");
    const query = searchParams.get("query") || searchParams.get("q");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!channelId) {
      return new NextResponse("Channel ID Missing", { status: 400 });
    }

    if (!query || !query.trim()) {
      return NextResponse.json([]);
    }

    const searchTerm = query.trim();

    const messages = await db.message.findMany({
      where: {
        channelId,
        deleted: false,
        content: {
          contains: searchTerm
        }
      },
      include: {
        member: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[MESSAGES_SEARCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
