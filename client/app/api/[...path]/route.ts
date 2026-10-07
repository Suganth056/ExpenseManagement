// app/api/[...path]/route.ts
// The session cookie is httpOnly, so the browser can't send it to FastAPI directly.
// This proxy reads it server-side and forwards it as a Bearer token.
import { cookies } from "next/headers";
import { BASE_URL } from "@/ENUM";

async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const token = (await cookies()).get("session")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  console.log(path);
  const hasBody = !["GET", "DELETE"].includes(req.method);
  const res = await fetch(`${BASE_URL}/${path.join("/")}`, {
    method: req.method,
    body: hasBody ? await req.text() : undefined,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };