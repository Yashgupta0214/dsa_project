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
  const fileType = value?.split(".").pop();
  const accept = endpoint === "serverImage" ? "image/*" : "image/*,.pdf";

  const uploadFile = async (file?: File) => {
    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("endpoint", endpoint);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { url: string };
      onChange(data.url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Upload failed. Try again."
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (value && fileType !== "pdf") {
    return (
      <div className="relative h-20 w-20">
        <Image fill src={value} alt="Upload" className="rounded-full" />
        <button
          onClick={() => onChange("")}
          className="bg-rose-500 text-white p-1 rounded-full absolute top-0 right-0 shadow-sm"
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (value && fileType === "pdf") {
    return (
      <div className="relative mt-2 flex w-full max-w-sm items-center gap-x-3 rounded-lg border border-black/5 bg-zinc-100/70 p-3 pr-10 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-indigo-500/10">
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
    <div className="w-full min-w-[280px]">
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
          "flex min-h-[224px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300/60 bg-zinc-100/40 px-6 py-8 text-center transition dark:border-white/10 dark:bg-white/[0.03]",
          "hover:border-indigo-500/70 hover:bg-indigo-500/5 disabled:cursor-not-allowed disabled:opacity-80",
          isDragging && "border-indigo-500 bg-indigo-500/10"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => void uploadFile(event.target.files?.[0])}
        />
        <UploadCloud className="h-12 w-12 text-zinc-400" />
        <span className="mt-4 text-sm font-semibold text-indigo-500">
          {isUploading ? "Uploading..." : "Choose a file or drag it here"}
        </span>
        <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {endpoint === "serverImage" ? "IMAGE" : "IMAGE, PDF"} up to 4MB
        </span>
        {isUploading && (
          <GradientLoader className="mt-5 h-6 w-6" />
        )}
      </button>
      {error && (
        <p className="mt-2 max-w-[280px] text-center text-xs font-medium text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
