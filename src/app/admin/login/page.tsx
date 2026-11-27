"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Delete, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"pin" | "email">("pin");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("organizer@ayyappatemple.org");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitPin = async (pinValue: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Wrong PIN");
        setPin("");
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

  const handleDigit = (digit: string) => {
    if (loading || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === 4) {
      submitPin(next);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#E9DDC9] overflow-hidden">
        <div className="bg-[#5B1717] text-[#F8F3E9] px-6 py-5 text-center border-b border-[#B58A45]/50">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#E9DDC9]">
            స్వామియే శరణం అయ్యప్ప
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Lock className="w-4 h-4 text-[#B58A45]" />
            <h1 className="font-editorial text-2xl font-semibold">
              నిర్వాహక లాగిన్ • Organizer
            </h1>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-[#A83224]/10 border border-[#A83224]/30 text-[#A83224] rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === "pin" ? (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-[#29231F]">
                  4 అంకెల పిన్ నమోదు చేయండి
                </p>
                <p className="text-xs text-[#29231F]/65">
                  Enter 4-Digit Organizer PIN
                </p>
              </div>

              {/* 4 PIN Dots */}
              <div className="flex justify-center gap-3 py-1">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = idx < pin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition ${
                        filled
                          ? "border-[#5B1717] bg-[#5B1717] text-[#F8F3E9]"
                          : "border-[#E9DDC9] bg-[#F8F3E9]/50 text-[#29231F]"
                      }`}
                    >
                      {filled ? "•" : ""}
                    </div>
                  );
                })}
              </div>

              {/* Large Tappable Keypad */}
              <div className="grid grid-cols-3 gap-2.5">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={loading}
                    onClick={() => handleDigit(d)}
                    className="h-14 rounded-xl bg-[#F8F3E9] hover:bg-[#E9DDC9] active:scale-95 border border-[#E9DDC9] text-xl font-bold text-[#29231F] transition"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setPin("")}
                  className="h-14 rounded-xl bg-white hover:bg-[#F8F3E9] border border-[#E9DDC9] text-xs font-semibold text-[#29231F]/70"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDigit("0")}
                  className="h-14 rounded-xl bg-[#F8F3E9] hover:bg-[#E9DDC9] active:scale-95 border border-[#E9DDC9] text-xl font-bold text-[#29231F] transition"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleBackspace}
                  className="h-14 rounded-xl bg-white hover:bg-[#F8F3E9] border border-[#E9DDC9] flex items-center justify-center text-[#5B1717]"
                  aria-label="Backspace"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              {loading && (
                <p className="text-center text-xs font-semibold text-[#5B1717]">
                  Checking PIN...
                </p>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("email");
                  }}
                  className="text-xs text-[#29231F]/60 hover:text-[#5B1717] underline underline-offset-4"
                >
                  Use Email &amp; Password instead
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode("pin");
                  }}
                  className="text-xs font-semibold text-[#5B1717] underline underline-offset-4"
                >
                  ← Back to 4-Digit PIN Login
                </button>
              </div>
            </form>
          )}

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
