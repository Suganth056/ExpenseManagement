// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { BASE_URL } from "@/ENUM";

export async function POST(request: NextRequest) {
  const user = await verifySession((await cookies()).get("session")?.value);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const res = await fetch(`${BASE_URL}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": process.env.INTERNAL_API_KEY!, // shared secret with FastAPI
    },
    body: JSON.stringify({ ...body, email: user.email }), // email comes from the session
  });

  return NextResponse.json(await res.json(), { status: res.status });
}