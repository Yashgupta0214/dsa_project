import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const conversationId = searchParams.get("conversationId");
    const query = searchParams.get("query") || searchParams.get("q");

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!conversationId) {
      return new NextResponse("Conversation ID Missing", { status: 400 });
    }

    if (!query || !query.trim()) {
      return NextResponse.json([]);
    }

    const searchTerm = query.trim();

    const directMessages = await db.directMessage.findMany({
      where: {
        conversationId,
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

    return NextResponse.json(directMessages);
  } catch (error) {
    console.error("[DIRECT_MESSAGES_SEARCH_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
