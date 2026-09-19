import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { MemberRole } from "@prisma/client";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

const fallbackServerImage = (name: string) => {
  const initial = name.trim().charAt(0).toUpperCase() || "S";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="#5865f2"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${initial}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export async function POST(req: Request) {
  try {
    const { name, imageUrl } = await req.json();
    const profile = await currentProfile();

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    const server = await db.server.create({
      data: {
        profileId: profile.id,
        name,
        imageUrl: imageUrl || fallbackServerImage(name),
        inviteCode: uuidv4(),
        channels: { create: [{ name: "general", profileId: profile.id }] },
        members: { create: [{ profileId: profile.id, role: MemberRole.ADMIN }] }
      }
    });

    return NextResponse.json(server);
  } catch (error) {
    console.error("[SERVERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
