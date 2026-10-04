// lib/session.ts
import { jwtVerify } from "jose";

export type SessionUser = { email: string; name?: string; picture?: string };

export async function verifySession(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return {
      email: payload.email as string,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
    };
  } catch {
    return null; // expired or tampered
  }
}