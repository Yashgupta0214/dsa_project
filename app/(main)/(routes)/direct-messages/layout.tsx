import React from "react";

import { DirectMessagesSidebar } from "@/components/direct-messages/direct-messages-sidebar";

export default function DirectMessagesLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0 left-[72px]">
        <DirectMessagesSidebar />
      </div>
      <main className="h-full md:pl-60">{children}</main>
    </div>
  );
}
