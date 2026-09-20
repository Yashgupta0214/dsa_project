import { MessageCircle } from "lucide-react";

export default function DirectMessagesPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] text-zinc-500 dark:bg-[linear-gradient(180deg,#20222a_0%,#16171d_100%)] dark:text-zinc-400">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
        <MessageCircle className="h-8 w-8" />
      </div>
      <p className="mt-4 text-sm font-semibold">Choose a direct message</p>
    </div>
  );
}
