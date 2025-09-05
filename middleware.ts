import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|.*\\..*|sign-in|sign-up|api/webhooks|clerk).*)",
    "/(api|trpc)(.*)",
  ],
};
