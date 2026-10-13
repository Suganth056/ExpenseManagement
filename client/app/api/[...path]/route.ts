// app/api/[...path]/route.ts
// The session cookie is httpOnly and lives on the frontend domain, so the browser
// can't send it to FastAPI directly. This proxy reads it server-side and forwards
// it to the backend as a Bearer token.
import { cookies } from "next/headers";
import { BASE_URL } from "@/ENUM";

async function handler(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const token = (await cookies()).get("session")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // FastAPI collection routes end with a trailing slash ("/add-expense/").
  // Calling without it triggers a 307 redirect, and the Authorization header is
  // dropped when the redirect is followed. So build the exact URL up front:
  //   /api/add-expense      -> {BASE_URL}/add-expense/
  //   /api/add-expense/5    -> {BASE_URL}/add-expense/5
  const target =
    path.length === 1
      ? `${BASE_URL}/${path[0]}/`
      : `${BASE_URL}/${path.join("/")}`;

  const search = new URL(req.url).search;
  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);

  const res = await fetch(`${target}${search}`, {
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