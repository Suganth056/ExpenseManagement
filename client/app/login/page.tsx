"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {BASE_URL} from "@/ENUM"

export default function LoginPage() {
const [loading, setLoading] = useState(false);
const router = useRouter();

const handleGoogleLogin = () => {
  setLoading(true);
  window.location.href = `${BASE_URL}/auth/google`;
  // router.push(`${BASE_URL}/auth/google`);
};

return ( 
  <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4"> 
    <div className="w-full max-w-md">
    {/* Card */} 
      <div className="rounded-2xl border border-slate-900 bg-slate-700 p-8 shadow-2xl">

            {/* Heading */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Welcome back
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Sign in to continue to Expense Tracker
              </p>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100/80 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  Connecting...
                </>
              ) : (
                <>
                  {/* <Chrome className="h-5 w-5" /> */}
                  Continue with Google
                </>
              )}
            </button>

            {/* Divider */}
            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-500" />
              <span className="text-xs text-slate-100">
                SECURE LOGIN
              </span>
              <div className="h-px flex-1 bg-slate-500" />
            </div>
      </div>
    </div>
  </main>
);
}
