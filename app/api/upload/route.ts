import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf"
]);

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf"
};

export async function POST(req: Request) {
  const { userId } = auth();

  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const endpoint = formData.get("endpoint");

  if (!(file instanceof File)) {
    return new NextResponse("File is required", { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return new NextResponse("Only images and PDF files are allowed", {
      status: 400
    });
  }

  if (endpoint === "serverImage" && !file.type.startsWith("image/")) {
    return new NextResponse("Server icons must be image files", {
      status: 400
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    return new NextResponse("File must be 4MB or smaller", { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const fileName = `${randomUUID()}.${extensionByType[file.type]}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
