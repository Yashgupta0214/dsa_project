import { authMiddleware } from "@clerk/nextjs";
import type { NextRequest } from "next/server";

const isPublicRoute = (req: NextRequest) => {
  const path = req.nextUrl.pathname;

  return (
    path === "/api/uploadthing" ||
    path.startsWith("/api/socket/webhooks") ||
    path.startsWith("/api/socket/io") ||
    path.startsWith("/api/upload") ||
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/invite")
  );
};

export default authMiddleware({
  publicRoutes: isPublicRoute,
  ignoredRoutes: [
    "/api/socket/webhooks(.*)",
  ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};
