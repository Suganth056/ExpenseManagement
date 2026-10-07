//app/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { BASE_URL } from "@/ENUM";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  // 1. Check token
  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing_token", request.url)
    );
  } 

  // 2. Backend URL
  const backendUrl = BASE_URL;

  if (!backendUrl) {
    throw new Error("BACKEND_URL is missing");
  }

  // 3. Verify token with FastAPI
  const response = await fetch(
    `${backendUrl}/auth/verify?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      cache: "no-store",
    }
  );

  // 4. FastAPI rejected token
  if (!response.ok) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", request.url)
    );
  }

  // 5. Get user
  const result = await response.json();

  if (!result.user) {
    return NextResponse.redirect(
      new URL("/login?error=user_not_found", request.url)
    );
  }

  const user = result.user;

  // 6. Session secret
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is missing");
  }

  // 7. Create session JWT
  const secret = new TextEncoder().encode(sessionSecret);

  const sessionToken = await new SignJWT({
    email: user.email,
    name: user.name,
    picture: user.picture,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  // 8. Create redirect response
  const redirectResponse = NextResponse.redirect(
    new URL("/", request.url)
  );

  // 9. Set session cookie
  redirectResponse.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return redirectResponse;
}