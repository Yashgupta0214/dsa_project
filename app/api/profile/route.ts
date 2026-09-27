import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
        imageUrl: typeof imageUrl === "string" ? imageUrl : profile.imageUrl
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    console.error("[PROFILE_PATCH_ERROR]", error);
    return new NextResponse(
      error?.message || "Internal server error while saving profile.",
      { status: 500 }
    );
  }
}
