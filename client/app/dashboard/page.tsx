import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";


export default async function Dashboard() {
  const user = await verifySession((await cookies()).get("session")?.value);

  if (!user) {
    redirect("/login");
  }

  return <>DashBoard Page</>;
}