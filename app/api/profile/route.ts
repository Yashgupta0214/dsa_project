import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

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

    let finalImageUrl = imageUrl;

    // If imageUrl is a base64 data URL, convert it to a file on disk to prevent MySQL Text overflow
    if (finalImageUrl && typeof finalImageUrl === "string" && finalImageUrl.startsWith("data:image/")) {
      try {
        const matches = finalImageUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1].replace("jpeg", "jpg");
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          const uploadDir = path.join(process.cwd(), "public", "uploads");
          const fileName = `avatar-${randomUUID()}.${extension}`;

          await mkdir(uploadDir, { recursive: true });
          await writeFile(path.join(uploadDir, fileName), buffer);

          finalImageUrl = `/uploads/${fileName}`;
        }
      } catch (err) {
        console.error("[PROFILE_IMAGE_BASE64_SAVE_ERROR]", err);
      }
    }

    const updatedProfile = await db.profile.update({
      where: {
        id: profile.id
      },
      data: {
        name: name.trim(),
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {})
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
