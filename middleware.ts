import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: [
    "/api/uploadthing",
    "/api/livekit(.*)",
    "/api/socket/webhooks(.*)",
    "/api/socket/io(.*)",
    "/api/upload(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/invite(.*)",
  ],
  ignoredRoutes: [
    "/api/socket/webhooks(.*)",
  ],
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"]
};
