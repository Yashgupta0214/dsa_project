"use client";

import React, { useRef, useState } from "react";
import { FileIcon, UploadCloud, X } from "lucide-react";
import { GradientLoader } from "@/components/ui/loader";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface FileUploadProps {
  onChange: (url?: string) => void;
  value: string;
  endpoint: "messageFile" | "serverImage";
}

export function FileUpload({
  onChange,
  value,
  endpoint
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const isPdf = value?.toLowerCase().endsWith(".pdf") || value?.includes("application/pdf");
  const accept = endpoint === "serverImage" ? "image/*" : "image/*,.pdf";

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (file?: File) => {
    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      // First attempt: Upload to /api/upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("endpoint", endpoint);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = (await response.json()) as { url: string };
        onChange(data.url);
      } else {
        // Fallback to Data URL for image if backend is unavailable
        if (file.type.startsWith("image/")) {
          const dataUrl = await readFileAsDataUrl(file);
          onChange(dataUrl);
        } else {
          throw new Error(await response.text());
        }
      }
    } catch (err: any) {
      console.warn("Upload fallback activated:", err);
      if (file.type.startsWith("image/")) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          onChange(dataUrl);
        } catch {
          setError("Failed to process image.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Upload failed. Try again.");
      }
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (value && !isPdf) {
    return (
      <div className="relative h-24 w-24 rounded-full overflow-hidden group ring-2 ring-indigo-500/40 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Upload preview"
          className="h-full w-full object-cover rounded-full"
        />
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full absolute top-1 right-1 shadow-md transition-transform hover:scale-110 z-10"
          type="button"
          title="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (value && isPdf) {
    return (
      <div className="relative mt-2 flex w-full max-w-sm items-center gap-x-3 rounded-xl border border-black/10 bg-zinc-100/80 p-3.5 pr-10 dark:border-white/10 dark:bg-white/[0.04] shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
          <FileIcon className="h-6 w-6 fill-indigo-200 stroke-indigo-500" />
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            PDF attachment ready
          </p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-400"
          >
            Open preview
          </a>
        </div>
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-3 rounded-full bg-rose-500 p-1 text-white shadow-sm transition hover:bg-rose-600"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex min-h-[160px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 hover:bg-indigo-500/[0.03] p-6 text-center transition-all dark:bg-white/[0.02]",
          "hover:border-indigo-500/70 disabled:cursor-not-allowed disabled:opacity-80",
          isDragging && "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => void uploadFile(event.target.files?.[0])}
        />
        <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-2">
          <UploadCloud className="h-6 w-6 text-indigo-500" />
        </div>
        <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
          {isUploading ? "Uploading..." : "Choose a photo or drag it here"}
        </span>
        <span className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          {endpoint === "serverImage" ? "PNG, JPG, WEBP, GIF" : "IMAGE, PDF"} up to 10MB
        </span>
        {isUploading && <GradientLoader className="mt-4 h-5 w-5" />}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs font-medium text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
