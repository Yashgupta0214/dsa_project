import { Loader2 } from "lucide-react";

export default function DirectMessageLoading() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] dark:bg-[linear-gradient(180deg,#20222a_0%,#16171d_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.12)_0%,transparent_38%,rgba(20,184,166,0.08)_100%)] dark:bg-[linear-gradient(135deg,rgba(99,102,241,0.16)_0%,transparent_40%,rgba(20,184,166,0.1)_100%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex h-[53px] items-center gap-x-3 border-b border-black/5 px-4 dark:border-white/10">
          <div className="h-8 w-8 rounded-full bg-zinc-300/70 dark:bg-white/10" />
          <div className="h-4 w-32 rounded bg-zinc-300/70 dark:bg-white/10" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <Loader2 className="my-4 h-7 w-7 animate-spin text-zinc-500" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Opening conversation...
          </p>
        </div>
      </div>
    </div>
  );
}
