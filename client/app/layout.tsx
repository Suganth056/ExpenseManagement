// app/layout.tsx
import "./globals.css";   // <- this line was missing
import { cookies } from "next/headers";
import { AuthProvider } from "@/context/AuthContext";
import { verifySession } from "@/lib/session";


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const user = await verifySession(cookieStore.get("session")?.value);

  return (
    <html lang="en">
      <body>
        <AuthProvider initialUser={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}