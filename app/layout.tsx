import "./globals.css";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Discord — Your Place to Talk and Hang Out",
  description:
    "Next-generation Discord community platform with real-time text channels, voice & video rooms, and encrypted direct messages."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-[#f2f3f5] dark:bg-[#1e1f22] font-sans antialiased overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-300"
        )}
      >
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#6366f1",
              colorBackground: "#1e1f22",
              colorInputBackground: "#111214",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#94a3b8"
            },
            elements: {
              card: "shadow-2xl border border-white/10 backdrop-blur-xl bg-[#1e1f22]/95 rounded-2xl",
              formButtonPrimary:
                "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition shadow-lg shadow-indigo-500/25 font-semibold",
              footerActionLink: "text-indigo-400 hover:text-indigo-300",
              formFieldInput:
                "border-white/10 bg-[#111214] text-white focus:border-indigo-500 rounded-lg",
              userButtonPopoverCard:
                "bg-[#1e1f22] border border-white/10 shadow-2xl text-white"
            }
          }}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="discord-clone-theme"
          >
            <SocketProvider>
              <NotificationProvider>
                <ModalProvider />
                <QueryProvider>{children}</QueryProvider>
              </NotificationProvider>
            </SocketProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
