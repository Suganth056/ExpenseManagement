
// app/auth/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { BASE_URL, FRONTEND_URL } from "@/ENUM";

export async function GET(request: NextRequest) {
  // 1. Get the token from the callback URL
  const token = request.nextUrl.searchParams.get("token");

  // 2. Validate configuration
  if (!BASE_URL) {
    throw new Error("BASE_URL is missing");
  }

  if (!FRONTEND_URL) {
    throw new Error("FRONTEND_URL is missing");
  }

  // 3. Helper function for all frontend redirects
  const redirectToFrontend = (path: string) => {
    return NextResponse.redirect(new URL(path, FRONTEND_URL));
  };

  // 4. Check whether the token exists
  if (!token) {
    return redirectToFrontend("/login?error=missing_token");
  }

  try {
    // 5. Verify the token with the FastAPI backend
    const response = await fetch(
      `${BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    // 6. Handle invalid or expired tokens
    if (!response.ok) {
      return redirectToFrontend("/login?error=invalid_token");
    }

    // 7. Read the backend response
    const result = await response.json();

    // 8. Check whether user details exist
    if (!result.user) {
      return redirectToFrontend("/login?error=user_not_found");
    }

    const user = result.user;

    // 9. Validate the session secret
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret) {
      throw new Error("SESSION_SECRET is missing");
    }

    // 10. Create the session JWT
    const secret = new TextEncoder().encode(sessionSecret);

    const sessionToken = await new SignJWT({
      email: user.email,
      name: user.name,
      picture: user.picture,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // 11. Redirect to the frontend homepage
    const redirectResponse = redirectToFrontend("/");

    // 12. Store the session in an HTTP-only cookie
    redirectResponse.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: FRONTEND_URL.startsWith("https://"),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // 13. Return the redirect response
    return redirectResponse;
  } catch (error) {
    console.error("Authentication callback error:", error);

    return redirectToFrontend(
      "/login?error=authentication_failed"
    );
  }
}
