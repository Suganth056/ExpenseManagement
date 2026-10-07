// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const user = await verifySession((await cookies()).get("session")?.value);
  if (!user) redirect("/login");
  return <Dashboard user={user as any} />;
}