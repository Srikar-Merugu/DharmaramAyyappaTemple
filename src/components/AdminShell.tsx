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
  Printer,
  Settings,
  Users,
} from "lucide-react";
import { AdminLangProvider, useAdminLang } from "./AdminLangContext";

function AdminShellInner({
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
  const { lang, setLang, at } = useAdminLang();

  const navItems = [
    { href: "/admin", label: at.nav.overview, icon: LayoutDashboard },
    { href: "/admin/registrations", label: at.nav.registrations, icon: ClipboardList },
    { href: "/admin/attendance", label: at.nav.attendance, icon: CheckSquare },
    { href: "/admin/profiles", label: at.nav.profiles, icon: Users },
    { href: "/admin/reports", label: at.nav.reports, icon: BarChart3 },
    { href: "/admin/posters", label: at.nav.posters, icon: Printer },
    { href: "/admin/settings", label: at.nav.settings, icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#29231F]">
      <header className="no-print bg-[#5B1717] text-[#F8F3E9] border-b border-[#B58A45]/60 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#3E0F0F] border border-[#B58A45]/70 flex items-center justify-center shrink-0">
              <span className="font-editorial text-sm text-[#E9DDC9]">ॐ</span>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[#E9DDC9]/80 font-semibold truncate">
                {at.brandSub}
              </div>
              <div className="font-editorial text-base sm:text-lg font-semibold leading-tight truncate">
                {adminName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Telugu / English Switcher */}
            <div className="inline-flex items-center rounded-full border border-[#B58A45]/60 bg-[#3E0F0F] p-0.5">
              <button
                type="button"
                onClick={() => setLang("te")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  lang === "te"
                    ? "bg-[#B58A45] text-[#29231F]"
                    : "text-[#E9DDC9] hover:text-white"
                }`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  lang === "en"
                    ? "bg-[#B58A45] text-[#29231F]"
                    : "text-[#E9DDC9] hover:text-white"
                }`}
              >
                English
              </button>
            </div>

            <span className="hidden lg:inline text-xs text-[#E9DDC9]/70">
              {adminEmail}
            </span>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3E0F0F] border border-[#B58A45]/40 text-[#E9DDC9] hover:text-white text-xs font-medium"
            >
              {at.publicPortal}
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A83224] hover:bg-[#8a281c] text-white text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{at.logout}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="bg-[#3E0F0F] border-t border-[#B58A45]/25 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1">
            {navItems.map((item) => {
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

export default function AdminShell(props: {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}) {
  return (
    <AdminLangProvider>
      <AdminShellInner {...props} />
    </AdminLangProvider>
  );
}
