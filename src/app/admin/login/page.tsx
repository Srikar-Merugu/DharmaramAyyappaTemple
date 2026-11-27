"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("organizer@ayyappatemple.org");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3E9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-[#E9DDC9] overflow-hidden">
        <div className="bg-[#5B1717] text-[#F8F3E9] px-6 py-5 text-center border-b border-[#B58A45]/50">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#E9DDC9]">
            Swamiye Saranam Ayyappa
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Lock className="w-4 h-4 text-[#B58A45]" />
            <h1 className="font-editorial text-2xl font-semibold">
              Annadanam Organizer Login
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          {error && (
            <div className="bg-[#A83224]/10 border border-[#A83224]/30 text-[#A83224] rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/80 mb-1.5">
                Organizer Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#E9DDC9] bg-[#F8F3E9]/40 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/80 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter organizer password"
                className="w-full rounded-lg border border-[#E9DDC9] bg-[#F8F3E9]/40 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] font-semibold text-sm transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="pt-3 border-t border-[#E9DDC9] text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B1717] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Public Annadanam Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
