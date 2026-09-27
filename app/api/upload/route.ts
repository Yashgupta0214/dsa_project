import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf"
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const profile = await currentProfile();

    if (!userId && !profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const endpoint = formData.get("endpoint");

    if (!(file instanceof File)) {
      return new NextResponse("File is required", { status: 400 });
    }

    const fileNameLower = (file.name || "").toLowerCase();
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp|ico)$/i.test(fileNameLower);
    const isPdf =
      file.type === "application/pdf" || fileNameLower.endsWith(".pdf");

    if (!isImage && !isPdf) {
      return new NextResponse("Only images and PDF files are allowed", {
        status: 400
      });
    }

    if (endpoint === "serverImage" && !isImage) {
      return new NextResponse("Server icons must be image files", {
        status: 400
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse("File must be 10MB or smaller", { status: 400 });
    }

    let ext: string = extensionByType[file.type] || "";
    if (!ext && file.name) {
      const parts = file.name.split(".");
      if (parts.length > 1) {
        ext = parts.pop()?.toLowerCase() || "";
      }
    }
    if (!ext) {
      ext = isImage ? "png" : "pdf";
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const fileName = `${randomUUID()}.${ext}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch (error: any) {
    console.error("[UPLOAD_ERROR]", error);
    return new NextResponse(
      error?.message || "Internal server error while uploading file",
      { status: 500 }
    );
  }
}
