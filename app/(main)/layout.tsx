import React from "react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { DirectMessagesSidebar } from "@/components/direct-messages/direct-messages-sidebar";

export default async function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <div className="hidden md:flex h-full w-[72px] z-30 flex-col fixed inset-y-0">
        <NavigationSidebar />
      </div>
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0 left-[72px]">
        <DirectMessagesSidebar />
      </div>
      <main className="md:pl-[312px] h-full">{children}</main>
    </div>
  );
}
