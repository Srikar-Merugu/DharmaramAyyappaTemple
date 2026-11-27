"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/attendance", label: "Attendance", icon: CheckSquare },
  { href: "/admin/profiles", label: "Swami Profiles", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings & QR", icon: Settings },
];

export default function AdminShell({
  adminName,
  adminEmail,
  children,
}: {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#29231F]">
      <header className="no-print bg-[#5B1717] text-[#F8F3E9] border-b border-[#B58A45]/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3E0F0F] border border-[#B58A45]/70 flex items-center justify-center shrink-0">
              <span className="font-editorial text-sm text-[#E9DDC9]">ॐ</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#E9DDC9]/80 font-semibold">
                Sri Ayyappa Swamy Annadanam
              </div>
              <div className="font-editorial text-lg font-semibold leading-tight">
                {adminName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden md:inline text-xs text-[#E9DDC9]/75">
              {adminEmail}
            </span>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3E0F0F] border border-[#B58A45]/40 text-[#E9DDC9] hover:text-white text-xs font-medium"
            >
              Public Portal
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A83224] hover:bg-[#8a281c] text-white text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="bg-[#3E0F0F] border-t border-[#B58A45]/25 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    active
                      ? "border-[#B58A45] text-[#F8F3E9] bg-[#5B1717]/60"
                      : "border-transparent text-[#E9DDC9]/75 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
