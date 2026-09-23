import { NextResponse } from "next/server";
import { MemberRole } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { serverId: string; webhookId: string } }
) {
  try {
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!params.serverId) {
      return new NextResponse("Server ID Missing", { status: 400 });
    }

    if (!params.webhookId) {
      return new NextResponse("Webhook ID Missing", { status: 400 });
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
      return new NextResponse("Forbidden", { status: 403 });
    }

    const webhook = await (db as any).webhook.delete({
      where: {
        id: params.webhookId,
        serverId: params.serverId
      }
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("[WEBHOOK_ID_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

