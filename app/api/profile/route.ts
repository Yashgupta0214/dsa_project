import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  try {
    const profile = await currentProfile();
    const { name, imageUrl } = await req.json();

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id
      },
      data: {
        name: name.trim(),
        ...(imageUrl && { imageUrl })
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("[PROFILE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
