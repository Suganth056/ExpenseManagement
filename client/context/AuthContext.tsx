// context/AuthContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/session";

type AuthContextType = {
  user: SessionUser | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}