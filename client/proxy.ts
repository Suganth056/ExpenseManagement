// proxy.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

const publicPaths = new Set(["/login", "/auth/callback"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.has(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }

  const user = await verifySession(request.cookies.get("session")?.value);

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!favicon.ico|.*\\.).*)"],
};
