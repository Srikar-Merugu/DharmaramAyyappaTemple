"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Menu,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { formatDateLabel, type DateAvailabilityReason } from "@/lib/timezone";

interface BatchAvail {
  batchId: string;
  name: string;
  nameTe: string;
  startTime: string;
  displayTime: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
  isFull: boolean;
}

interface DateInfo {
  date: string;
  available: boolean;
  reason: DateAvailabilityReason;
  isToday: boolean;
}

interface AvailabilityResponse {
  temple: {
    name: string;
    nameTe: string;
    contactInfo: string;
    seasonName: string;
    startDate: string;
    endDate: string;
    registrationEnabled: boolean;
    cutoffTime: string;
    timezone: string;
    allowVisitorCancel: boolean;
  };
  currentIST: { dateStr: string; timeStr: string };
  dates: DateInfo[];
  batches: BatchAvail[];
  availabilityByDate: Record<string, BatchAvail[]>;
}

interface MemberDraft {
  id: string;
  fullName: string;
  phone: string;
  village: string;
}

interface ConfirmationData {
  code: string;
  type: "individual" | "group";
  annadanamDate: string;
  batchId: string;
  memberCount: number;
  groupName: string | null;
  leaderName: string | null;
  members: Array<{ fullName: string; role: string }>;
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PublicRegistrationApp({
  mode = "full",
}: {
  mode?: "full" | "register";
}) {
  const [lang, setLang] = useState<Language>("te");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Registration flow: "select" | "details" | "review" | "confirmed"
  const [regStep, setRegStep] = useState<"select" | "details" | "review" | "confirmed">("select");
  const [regType, setRegType] = useState<"individual" | "group">("individual");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  // Individual fields
  const [indName, setIndName] = useState("");
  const [indPhone, setIndPhone] = useState("");
  const [indVillage, setIndVillage] = useState("");

  // Group fields
  const [groupName, setGroupName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [leaderVillage, setLeaderVillage] = useState("");
  const [leaderAttending, setLeaderAttending] = useState(true);
  const [groupMembers, setGroupMembers] = useState<MemberDraft[]>([
    { id: "m-1", fullName: "", phone: "", village: "" },
  ]);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  // Self-cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelCode, setCancelCode] = useState("");
  const [cancelStatus, setCancelStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const dict = t(lang);

  useEffect(() => {
    setIdempotencyKey(makeIdempotencyKey());
    const saved = window.localStorage.getItem("ayyappa_lang");
    if (saved === "en" || saved === "te") {
      setLang(saved);
    }
  }, []);

  const toggleLang = (next: Language) => {
    setLang(next);
    window.localStorage.setItem("ayyappa_lang", next);
  };

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch("/api/public/availability", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json: AvailabilityResponse = await res.json();
      setData(json);

      const firstAvail = json.dates.find((d) => d.available);
      if (firstAvail) {
        setSelectedDate((prev) =>
          prev && json.dates.some((d) => d.date === prev && d.available)
            ? prev
            : firstAvail.date
        );
      } else if (json.dates[0]) {
        setSelectedDate((prev) => prev || json.dates[0].date);
      }
    } catch {
      setLoadError(
        lang === "te"
          ? "సమాచారం లోడ్ చేయడంలో లోపం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి."
          : "Unable to load schedule. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const batchesForSelectedDate = useMemo(() => {
    if (!data || !selectedDate) return data?.batches || [];
    return data.availabilityByDate[selectedDate] || data.batches;
  }, [data, selectedDate]);

  const selectedBatch = useMemo(
    () => batchesForSelectedDate.find((b) => b.batchId === selectedBatchId) || null,
    [batchesForSelectedDate, selectedBatchId]
  );

  const totalPeopleCount = useMemo(() => {
    if (regType === "individual") return 1;
    const extraCount = groupMembers.filter((m) => m.fullName.trim().length > 0).length;
    return (leaderAttending ? 1 : 0) + extraCount;
  }, [regType, leaderAttending, groupMembers]);

  const totalGroupSlotsRequested = useMemo(() => {
    if (regType === "individual") return 1;
    return (leaderAttending ? 1 : 0) + groupMembers.length;
  }, [regType, leaderAttending, groupMembers.length]);

  const addMemberRow = () => {
    setGroupMembers((prev) => [
      ...prev,
      { id: `m-${Date.now()}-${prev.length}`, fullName: "", phone: "", village: "" },
    ]);
  };

  const removeMemberRow = (id: string) => {
    setGroupMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMemberRow = (
    id: string,
    field: "fullName" | "phone" | "village",
    value: string
  ) => {
    setGroupMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleContinueToDetails = () => {
    setFormError(null);
    const dateObj = data?.dates.find((d) => d.date === selectedDate);
    if (!selectedDate || !dateObj?.available) {
      setFormError(dict.selectDate);
      return;
    }
    if (!selectedBatchId || !selectedBatch || selectedBatch.isFull) {
      setFormError(dict.selectBatch);
      return;
    }
    setIdempotencyKey(makeIdempotencyKey());
    setRegStep("details");
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDate || !selectedBatchId || !selectedBatch) {
      setFormError(dict.selectBatch);
      setRegStep("select");
      return;
    }

    if (regType === "individual") {
      if (indName.trim().length < 2) {
        setFormError(dict.requiredField);
        return;
      }
      if (selectedBatch.remaining < 1) {
        setFormError(dict.seatsNotEnough);
        return;
      }
    } else {
      if (leaderName.trim().length < 2) {
        setFormError(dict.requiredField);
        return;
      }
      const validExtra = groupMembers.filter((m) => m.fullName.trim().length > 0);
      if (!leaderAttending && validExtra.length === 0) {
        setFormError(dict.needOneMember);
        return;
      }
      const hasBlankExtra = groupMembers.some(
        (m) => (m.phone.trim() || m.village.trim()) && m.fullName.trim().length < 2
      );
      if (hasBlankExtra) {
        setFormError(dict.requiredField);
        return;
      }
      const count = (leaderAttending ? 1 : 0) + validExtra.length;
      if (count > selectedBatch.remaining) {
        setFormError(
          `${dict.seatsNotEnough} (${selectedBatch.remaining} ${dict.seatsLeft})`
        );
        return;
      }
    }

    setRegStep("review");
  };

  const handleSubmitRegistration = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      const payload =
        regType === "individual"
          ? {
              type: "individual" as const,
              annadanamDate: selectedDate,
              batchId: selectedBatchId,
              member: {
                fullName: indName.trim(),
                phone: indPhone.trim() || null,
                village: indVillage.trim() || null,
              },
              idempotencyKey,
            }
          : {
              type: "group" as const,
              annadanamDate: selectedDate,
              batchId: selectedBatchId,
              groupName: groupName.trim() || null,
              leaderName: leaderName.trim(),
              leaderPhone: leaderPhone.trim() || null,
              leaderVillage: leaderVillage.trim() || null,
              leaderAttending,
              members: groupMembers
                .filter((m) => m.fullName.trim().length > 0)
                .map((m) => ({
                  fullName: m.fullName.trim(),
                  phone: m.phone.trim() || null,
                  village: m.village.trim() || null,
                })),
              idempotencyKey,
            };

      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Registration failed.");
        setRegStep("details");
        await fetchAvailability();
        return;
      }

      setConfirmation(json);
      setRegStep("confirmed");
      await fetchAvailability();
    } catch {
      setFormError(
        lang === "te"
          ? "నెట్‌వర్క్ లోపం. దయచేసి మళ్లీ ప్రయత్నించండి."
          : "Network error. Please retry safely."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetRegistration = () => {
    setIndName("");
    setIndPhone("");
    setIndVillage("");
    setGroupName("");
    setLeaderName("");
    setLeaderPhone("");
    setLeaderVillage("");
    setLeaderAttending(true);
    setGroupMembers([{ id: "m-1", fullName: "", phone: "", village: "" }]);
    setSelectedBatchId("");
    setFormError(null);
    setConfirmation(null);
    setIdempotencyKey(makeIdempotencyKey());
    setRegStep("select");
  };

  const handleVisitorCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelStatus(null);
    setCancelling(true);
    try {
      const res = await fetch("/api/public/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cancelCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCancelStatus({ type: "error", msg: json.error || "Cancellation failed." });
      } else {
        setCancelStatus({ type: "success", msg: dict.cancelSuccess });
        setCancelCode("");
        await fetchAvailability();
      }
    } catch {
      setCancelStatus({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setCancelling(false);
    }
  };

  const navLinks = [
    { href: "#home", label: dict.navHome },
    { href: "#about", label: dict.navAbout },
    { href: "#schedule", label: dict.navSchedule },
    { href: "#register", label: dict.navRegister },
    { href: "#contact", label: dict.navContact },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#29231F]">
      {/* A. Minimal, Dignified Temple Navigation */}
      <header className="sticky top-0 z-40 bg-[#F8F3E9]/95 backdrop-blur-sm border-b border-[#E9DDC9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#home" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#5B1717] border border-[#B58A45] flex items-center justify-center shrink-0">
              <span className="text-[#F8F3E9] font-editorial text-lg font-semibold leading-none">
                ॐ
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#5B1717] font-semibold truncate">
                {dict.swamiSaranam}
              </p>
              <p className="font-editorial text-base sm:text-lg font-bold text-[#29231F] truncate leading-tight">
                {data
                  ? lang === "te"
                    ? data.temple.nameTe
                    : data.temple.name
                  : dict.annadanamTitle}
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#29231F]/80">
            {mode === "register" ? (
              <Link
                href="/"
                className="hover:text-[#5B1717] transition-colors py-1"
              >
                ← {dict.navHome}
              </Link>
            ) : (
              navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="hover:text-[#5B1717] transition-colors py-1"
                >
                  {l.label}
                </a>
              ))
            )}
          </nav>

          {/* Language Switcher + Mobile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="inline-flex items-center rounded-full border border-[#B58A45]/50 bg-[#E9DDC9]/50 p-0.5"
              role="group"
              aria-label="Language selector"
            >
              <button
                type="button"
                onClick={() => toggleLang("te")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  lang === "te"
                    ? "bg-[#5B1717] text-[#F8F3E9]"
                    : "text-[#29231F] hover:text-[#5B1717]"
                }`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => toggleLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  lang === "en"
                    ? "bg-[#5B1717] text-[#F8F3E9]"
                    : "text-[#29231F] hover:text-[#5B1717]"
                }`}
              >
                English
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg border border-[#E9DDC9] text-[#29231F]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-[#E9DDC9] bg-[#F8F3E9] px-4 py-3 space-y-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 px-2 text-sm font-medium text-[#29231F] hover:text-[#5B1717] rounded-lg hover:bg-[#E9DDC9]/40"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        {mode === "full" && (
          <>
            {/* B. HERO SECTION */}
        <section
          id="home"
          className="relative min-h-[520px] sm:min-h-[580px] flex items-center bg-[#29231F] overflow-hidden"
        >
          {/* Replacement point: swap /images/hero-temple.jpg with the temple's own photograph */}
          <Image
            src="/images/hero-temple.jpg"
            alt="Traditional South Indian temple stone mandapam illuminated by brass oil lamps"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#29231F]/92 via-[#29231F]/75 to-[#29231F]/35"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl space-y-5 animate-gentle-in">
              <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-[#E9DDC9] font-semibold">
                {dict.heroEyebrow}
              </p>

              <h1 className="font-editorial text-3xl sm:text-5xl lg:text-6xl font-semibold text-[#F8F3E9] leading-[1.15]">
                {dict.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-[#E9DDC9]/90 leading-relaxed max-w-xl">
                {dict.heroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href="#register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] border border-[#B58A45]/70 text-[#F8F3E9] font-semibold text-sm sm:text-base transition"
                >
                  {dict.heroPrimaryCta}
                  <ChevronRight className="w-4 h-4" />
                </a>
                <a
                  href="#schedule"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-lg border border-[#E9DDC9]/60 bg-[#29231F]/40 hover:bg-[#29231F]/70 text-[#F8F3E9] font-medium text-sm sm:text-base transition"
                >
                  {dict.heroSecondaryCta}
                </a>
              </div>

              <p className="pt-3 text-xs tracking-[0.18em] uppercase text-[#B58A45] font-semibold">
                {dict.swamiSaranam}
              </p>
            </div>
          </div>
        </section>

        {/* C. ANNADANAM INTRODUCTION */}
        <section id="about" className="py-14 sm:py-20 border-b border-[#E9DDC9]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-6 space-y-5">
                <p className="text-xs tracking-[0.18em] uppercase text-[#5B1717] font-semibold">
                  {dict.aboutEyebrow}
                </p>
                <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#29231F] leading-tight">
                  {dict.aboutTitle}
                </h2>
                <div className="w-16 h-0.5 bg-[#B58A45]" />
                <p className="text-[#29231F]/85 text-base leading-relaxed">
                  {dict.aboutBody1}
                </p>
                <p className="text-[#29231F]/80 text-base leading-relaxed">
                  {dict.aboutBody2}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="p-4 rounded-lg bg-white/70 border border-[#E9DDC9]">
                    <div className="font-semibold text-sm text-[#5B1717]">
                      {dict.aboutHighlight1Title}
                    </div>
                    <div className="text-xs text-[#29231F]/75 mt-1 leading-relaxed">
                      {dict.aboutHighlight1Desc}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/70 border border-[#E9DDC9]">
                    <div className="font-semibold text-sm text-[#5B1717]">
                      {dict.aboutHighlight2Title}
                    </div>
                    <div className="text-xs text-[#29231F]/75 mt-1 leading-relaxed">
                      {dict.aboutHighlight2Desc}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/70 border border-[#E9DDC9]">
                    <div className="font-semibold text-sm text-[#5B1717]">
                      {dict.aboutHighlight3Title}
                    </div>
                    <div className="text-xs text-[#29231F]/75 mt-1 leading-relaxed">
                      {dict.aboutHighlight3Desc}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                {/* Replacement point: /images/annadanam-meal.jpg */}
                <div className="relative aspect-[4/5] rounded-lg overflow-hidden border border-[#E9DDC9] bg-[#E9DDC9]">
                  <Image
                    src="/images/annadanam-meal.jpg"
                    alt="Traditional South Indian vegetarian Annadanam meal served on a fresh banana leaf"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                {/* Replacement point: /images/annadanam-lamps.jpg */}
                <div className="relative aspect-[4/5] rounded-lg overflow-hidden border border-[#E9DDC9] bg-[#E9DDC9] mt-6">
                  <Image
                    src="/images/annadanam-lamps.jpg"
                    alt="Traditional brass nilavilakku temple lamps lit with warm flames"
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* D. DAILY SCHEDULE SECTION */}
        <section id="schedule" className="py-14 sm:py-20 bg-[#E9DDC9]/35 border-b border-[#E9DDC9]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs tracking-[0.18em] uppercase text-[#5B1717] font-semibold">
                {data?.temple.seasonName || dict.swamiSaranam}
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#29231F]">
                {dict.timingsTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#29231F]/75">
                {dict.scheduleSubtitle}
              </p>
            </div>

            {loading && !data ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-lg bg-white/70 border border-[#E9DDC9] animate-pulse"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="bg-white rounded-lg border border-[#A83224]/30 p-6 text-center">
                <p className="text-sm text-[#A83224] font-medium">{loadError}</p>
                <button
                  type="button"
                  onClick={fetchAvailability}
                  className="mt-3 px-4 py-2 rounded-lg bg-[#5B1717] text-[#F8F3E9] text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : (
              data && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {batchesForSelectedDate.map((b) => {
                      const pct = Math.min(
                        100,
                        Math.round((b.bookedCount / b.capacity) * 100)
                      );
                      return (
                        <div
                          key={b.batchId}
                          className="bg-[#F8F3E9] rounded-lg border border-[#E9DDC9] p-6 flex flex-col justify-between space-y-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold uppercase tracking-wider text-[#5B1717]">
                                {lang === "te" ? b.nameTe : b.name}
                              </span>
                              <div className="font-editorial text-3xl font-bold text-[#29231F] mt-1">
                                {b.displayTime}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                b.isFull
                                  ? "bg-[#A83224]/15 text-[#A83224]"
                                  : "bg-[#52664B]/15 text-[#52664B]"
                              }`}
                            >
                              {b.isFull ? dict.full : `${b.remaining} ${dict.seatsLeft}`}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-[#29231F]/70">
                              <span>
                                {dict.registered}: {b.bookedCount} / {b.capacity}
                              </span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#E9DDC9] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  b.isFull ? "bg-[#A83224]" : "bg-[#52664B]"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#29231F]/75 pt-1">
                    <span>
                      • {dict.batchCapacityNote} &nbsp;|&nbsp; • {dict.cutoffNote}
                    </span>
                    <span className="font-mono text-[11px] text-[#5B1717]">
                      IST: {data.currentIST.timeStr}
                    </span>
                  </div>
                </>
              )
            )}
          </div>
        </section>
          </>
        )}

        {/* E. MOBILE-FIRST REGISTRATION SECTION */}
        <section id="register" className="py-14 sm:py-20 border-b border-[#E9DDC9]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center space-y-2 mb-8">
              <p className="text-xs tracking-[0.18em] uppercase text-[#5B1717] font-semibold">
                {dict.swamiSaranam}
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#29231F]">
                {dict.annadanamTitle}
              </h2>
              <p className="text-sm text-[#29231F]/75">{dict.subtitle}</p>
            </div>

            {data && (
              <div className="bg-white rounded-xl border border-[#E9DDC9] p-5 sm:p-8 shadow-sm">
                {/* STEP 1: TYPE, DATE, BATCH */}
                {regStep === "select" && (
                  <div className="space-y-7">
                    {formError && (
                      <div className="p-3.5 rounded-lg bg-[#A83224]/10 border border-[#A83224]/30 text-[#A83224] text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Registration Type */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#29231F] mb-3">
                        1. {dict.chooseType}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRegType("individual")}
                          className={`p-4 rounded-lg border text-left transition flex items-center gap-3.5 ${
                            regType === "individual"
                              ? "border-[#5B1717] bg-[#5B1717]/5 ring-1 ring-[#5B1717]"
                              : "border-[#E9DDC9] hover:border-[#B58A45]"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              regType === "individual"
                                ? "bg-[#5B1717] text-[#F8F3E9]"
                                : "bg-[#E9DDC9]/60 text-[#29231F]"
                            }`}
                          >
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#29231F]">
                              {dict.individualTitle}
                            </div>
                            <div className="text-xs text-[#29231F]/70">
                              {dict.individualDesc}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRegType("group")}
                          className={`p-4 rounded-lg border text-left transition flex items-center gap-3.5 ${
                            regType === "group"
                              ? "border-[#5B1717] bg-[#5B1717]/5 ring-1 ring-[#5B1717]"
                              : "border-[#E9DDC9] hover:border-[#B58A45]"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              regType === "group"
                                ? "bg-[#5B1717] text-[#F8F3E9]"
                                : "bg-[#E9DDC9]/60 text-[#29231F]"
                            }`}
                          >
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-[#29231F]">
                              {dict.groupTitle}
                            </div>
                            <div className="text-xs text-[#29231F]/70">
                              {dict.groupDesc}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Date Picker */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#29231F] mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#5B1717]" />
                        2. {dict.selectDate}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {data.dates.map((d, idx) => {
                          const isSelected = selectedDate === d.date;
                          const dayTag =
                            idx === 0
                              ? dict.today
                              : idx === 1
                              ? dict.tomorrow
                              : dict.dayAfter;
                          return (
                            <button
                              key={d.date}
                              type="button"
                              disabled={!d.available}
                              onClick={() => {
                                setSelectedDate(d.date);
                                setSelectedBatchId("");
                                setFormError(null);
                              }}
                              className={`p-3.5 rounded-lg border text-left transition ${
                                !d.available
                                  ? "bg-[#E9DDC9]/30 border-[#E9DDC9] text-[#29231F]/40 cursor-not-allowed"
                                  : isSelected
                                  ? "border-[#5B1717] bg-[#5B1717]/5 ring-1 ring-[#5B1717]"
                                  : "border-[#E9DDC9] hover:border-[#B58A45]"
                              }`}
                            >
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B1717]">
                                {dayTag}
                              </div>
                              <div className="text-sm font-semibold mt-0.5">
                                {formatDateLabel(d.date, lang)}
                              </div>
                              {!d.available && d.reason && (
                                <div className="text-[11px] text-[#A83224] mt-1">
                                  {dict.reasons[d.reason]}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Batch Selector */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#29231F] mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#5B1717]" />
                        3. {dict.selectBatch}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {batchesForSelectedDate.map((b) => {
                          const isSelected = selectedBatchId === b.batchId;
                          const dateAvail = data.dates.find(
                            (d) => d.date === selectedDate
                          )?.available;
                          const disabled = b.isFull || !dateAvail;
                          return (
                            <button
                              key={b.batchId}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                setSelectedBatchId(b.batchId);
                                setFormError(null);
                              }}
                              className={`p-4 rounded-lg border text-left transition ${
                                disabled
                                  ? "bg-[#E9DDC9]/30 border-[#E9DDC9] text-[#29231F]/40 cursor-not-allowed"
                                  : isSelected
                                  ? "border-[#5B1717] bg-[#5B1717]/5 ring-1 ring-[#5B1717]"
                                  : "border-[#E9DDC9] hover:border-[#B58A45]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#5B1717]">
                                  {lang === "te" ? b.nameTe : b.name}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                    b.isFull
                                      ? "bg-[#A83224]/15 text-[#A83224]"
                                      : "bg-[#52664B]/15 text-[#52664B]"
                                  }`}
                                >
                                  {b.isFull ? dict.full : `${b.remaining} ${dict.seatsLeft}`}
                                </span>
                              </div>
                              <div className="font-editorial text-2xl font-bold text-[#29231F] mt-1">
                                {b.displayTime}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleContinueToDetails}
                      className="w-full py-3.5 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] font-semibold text-sm sm:text-base transition flex items-center justify-center gap-2"
                    >
                      {dict.registerCta}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* STEP 2: MEMBER DETAILS */}
                {regStep === "details" && (
                  <form onSubmit={handleProceedToReview} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-[#E9DDC9] pb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormError(null);
                          setRegStep("select");
                        }}
                        className="text-sm font-semibold text-[#5B1717] hover:underline"
                      >
                        ← {dict.back}
                      </button>
                      <div className="text-xs font-medium text-[#29231F]/75">
                        {formatDateLabel(selectedDate, lang)} •{" "}
                        {selectedBatch?.displayTime}
                      </div>
                    </div>

                    {formError && (
                      <div className="p-3.5 rounded-lg bg-[#A83224]/10 border border-[#A83224]/30 text-[#A83224] text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {regType === "individual" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#29231F] mb-1.5">
                            {dict.fullName} <span className="text-[#A83224]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={indName}
                            onChange={(e) => setIndName(e.target.value)}
                            placeholder={dict.fullNamePlaceholder}
                            className="w-full rounded-lg border border-[#E9DDC9] bg-[#F8F3E9]/40 px-3.5 py-3 text-base focus:outline-none focus:border-[#5B1717] focus:ring-1 focus:ring-[#5B1717]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-[#29231F] mb-1.5">
                              {dict.phone}
                            </label>
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={indPhone}
                              onChange={(e) => setIndPhone(e.target.value)}
                              placeholder={dict.phonePlaceholder}
                              className="w-full rounded-lg border border-[#E9DDC9] bg-[#F8F3E9]/40 px-3.5 py-3 text-base focus:outline-none focus:border-[#5B1717] focus:ring-1 focus:ring-[#5B1717]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[#29231F] mb-1.5">
                              {dict.village}
                            </label>
                            <input
                              type="text"
                              value={indVillage}
                              onChange={(e) => setIndVillage(e.target.value)}
                              placeholder={dict.villagePlaceholder}
                              className="w-full rounded-lg border border-[#E9DDC9] bg-[#F8F3E9]/40 px-3.5 py-3 text-base focus:outline-none focus:border-[#5B1717] focus:ring-1 focus:ring-[#5B1717]"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-4 rounded-lg bg-[#F8F3E9]/70 border border-[#E9DDC9] space-y-3.5">
                          <h3 className="text-sm font-semibold text-[#5B1717]">
                            {dict.leaderDetails}
                          </h3>
                          <div>
                            <label className="block text-xs font-semibold text-[#29231F] mb-1">
                              {dict.leaderName}{" "}
                              <span className="text-[#A83224]">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={leaderName}
                              onChange={(e) => setLeaderName(e.target.value)}
                              placeholder={dict.fullNamePlaceholder}
                              className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={leaderPhone}
                              onChange={(e) => setLeaderPhone(e.target.value)}
                              placeholder={dict.phone}
                              className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                            <input
                              type="text"
                              value={leaderVillage}
                              onChange={(e) => setLeaderVillage(e.target.value)}
                              placeholder={dict.village}
                              className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                          </div>
                          <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder={dict.groupName}
                            className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
                          />
                          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={leaderAttending}
                              onChange={(e) => setLeaderAttending(e.target.checked)}
                              className="w-4 h-4 accent-[#5B1717]"
                            />
                            <span className="text-sm text-[#29231F]">
                              {dict.leaderAttending}
                            </span>
                          </label>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#29231F]">
                              {dict.membersList}
                            </h3>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E9DDC9] text-[#29231F]">
                              {dict.totalPeople}: {totalPeopleCount}
                            </span>
                          </div>

                          {groupMembers.map((m, idx) => (
                            <div
                              key={m.id}
                              className="p-3.5 rounded-lg bg-[#F8F3E9]/50 border border-[#E9DDC9] space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#5B1717]">
                                  #{idx + 1}
                                </span>
                                {(groupMembers.length > 1 || leaderAttending) && (
                                  <button
                                    type="button"
                                    onClick={() => removeMemberRow(m.id)}
                                    className="text-xs text-[#A83224] font-semibold flex items-center gap-1 hover:underline"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {dict.remove}
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={m.fullName}
                                onChange={(e) =>
                                  updateMemberRow(m.id, "fullName", e.target.value)
                                }
                                placeholder={`${dict.fullName} *`}
                                className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <input
                                  type="tel"
                                  inputMode="numeric"
                                  value={m.phone}
                                  onChange={(e) =>
                                    updateMemberRow(m.id, "phone", e.target.value)
                                  }
                                  placeholder={dict.phone}
                                  className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                                />
                                <input
                                  type="text"
                                  value={m.village}
                                  onChange={(e) =>
                                    updateMemberRow(m.id, "village", e.target.value)
                                  }
                                  placeholder={dict.village}
                                  className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                                />
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addMemberRow}
                            disabled={
                              selectedBatch
                                ? totalGroupSlotsRequested >= selectedBatch.remaining
                                : false
                            }
                            className="w-full py-2.5 rounded-lg border border-dashed border-[#B58A45] text-[#5B1717] font-semibold text-sm hover:bg-[#E9DDC9]/30 flex items-center justify-center gap-1.5 disabled:opacity-40"
                          >
                            <Plus className="w-4 h-4" />
                            {dict.addMember.replace(/^\+\s*/, "")}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] font-semibold text-sm sm:text-base transition"
                    >
                      {dict.reviewSubmit}
                    </button>
                  </form>
                )}

                {/* STEP 3: REVIEW */}
                {regStep === "review" && selectedBatch && (
                  <div className="space-y-5">
                    <h3 className="font-editorial text-2xl font-semibold text-[#29231F]">
                      {dict.reviewTitle}
                    </h3>
                    <div className="rounded-lg bg-[#F8F3E9] border border-[#E9DDC9] p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#29231F]/70">{dict.dateLabel}</span>
                        <span className="font-semibold">
                          {formatDateLabel(selectedDate, lang)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#29231F]/70">{dict.batchLabel}</span>
                        <span className="font-semibold">
                          {lang === "te" ? selectedBatch.nameTe : selectedBatch.name} (
                          {selectedBatch.displayTime})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#29231F]/70">{dict.countLabel}</span>
                        <span className="font-semibold">{totalPeopleCount}</span>
                      </div>
                    </div>

                    <ul className="divide-y divide-[#E9DDC9] border border-[#E9DDC9] rounded-lg overflow-hidden text-sm">
                      {regType === "individual" ? (
                        <li className="px-4 py-2.5 font-medium">
                          {indName}
                          {indVillage ? ` • ${indVillage}` : ""}
                        </li>
                      ) : (
                        <>
                          {leaderAttending && (
                            <li className="px-4 py-2.5 font-medium bg-[#F8F3E9]/60">
                              {leaderName} (Leader)
                              {leaderVillage ? ` • ${leaderVillage}` : ""}
                            </li>
                          )}
                          {groupMembers
                            .filter((m) => m.fullName.trim().length > 0)
                            .map((m) => (
                              <li key={m.id} className="px-4 py-2.5">
                                {m.fullName}
                                {m.village ? ` • ${m.village}` : ""}
                              </li>
                            ))}
                        </>
                      )}
                    </ul>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setRegStep("details")}
                        className="py-3 rounded-lg border border-[#E9DDC9] font-semibold text-sm text-[#29231F] hover:bg-[#F8F3E9]"
                      >
                        {dict.back}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitRegistration}
                        className="py-3 rounded-lg bg-[#52664B] hover:bg-[#3f5039] text-white font-semibold text-sm disabled:opacity-60"
                      >
                        {submitting ? dict.submitting : dict.submit}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: F. CONFIRMATION PASS */}
                {regStep === "confirmed" && confirmation && (
                  <div className="space-y-6 text-center">
                    <div className="rounded-lg overflow-hidden border border-[#B58A45]/60 bg-[#F8F3E9]">
                      <div className="bg-[#5B1717] text-[#F8F3E9] px-5 py-4">
                        <p className="text-[11px] tracking-[0.2em] uppercase text-[#E9DDC9]">
                          {dict.swamiSaranam}
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <CheckCircle2 className="w-5 h-5 text-[#E9DDC9]" />
                          <h3 className="font-editorial text-2xl font-semibold">
                            {dict.confirmedTitle}
                          </h3>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6 space-y-5">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-[#5B1717] font-semibold">
                            {dict.regCode}
                          </div>
                          <div className="text-3xl font-mono font-bold tracking-widest text-[#29231F] mt-1">
                            {confirmation.code}
                          </div>
                        </div>

                        <div className="temple-rule text-xs text-[#B58A45]">◆</div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-left bg-white p-4 rounded-lg border border-[#E9DDC9]">
                          <div>
                            <div className="text-xs text-[#29231F]/60">
                              {dict.dateLabel}
                            </div>
                            <div className="font-semibold mt-0.5">
                              {formatDateLabel(confirmation.annadanamDate, lang)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[#29231F]/60">
                              {dict.batchLabel}
                            </div>
                            <div className="font-semibold mt-0.5">
                              {data.batches.find(
                                (b) => b.batchId === confirmation.batchId
                              )?.displayTime || confirmation.batchId}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[#29231F]/60">
                              {dict.countLabel}
                            </div>
                            <div className="font-semibold mt-0.5">
                              {confirmation.memberCount}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-xs font-semibold uppercase tracking-wider text-[#29231F]/60 mb-2">
                            {dict.membersList}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {confirmation.members.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-md bg-white border border-[#E9DDC9] text-xs font-medium text-[#29231F]"
                              >
                                {m.fullName}
                              </span>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-[#29231F]/70">
                          {dict.confirmedSubtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetRegistration}
                      className="w-full py-3 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] font-semibold text-sm"
                    >
                      {dict.newRegistration}
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-[#29231F]/65 text-center mt-5 leading-relaxed">
              {dict.privacyNotice}
            </p>
          </div>
        </section>

        {/* G. TEMPLE INFORMATION & CONTACT */}
        <section id="contact" className="py-14 sm:py-16 bg-[#E9DDC9]/35">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-xs tracking-[0.18em] uppercase text-[#5B1717] font-semibold">
                  {dict.contactEyebrow}
                </p>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#29231F]">
                  {dict.contactTitle}
                </h2>
              </div>

              <div className="bg-[#F8F3E9] rounded-lg border border-[#E9DDC9] p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5B1717]">
                  <Phone className="w-4 h-4" />
                  {dict.contactOfficeLabel}
                </div>
                <p className="text-sm font-medium text-[#29231F]">
                  {data?.temple.contactInfo || "Temple Annadanam Office"}
                </p>
                {data?.temple.allowVisitorCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelStatus(null);
                      setShowCancelModal(true);
                    }}
                    className="pt-1 text-xs font-semibold text-[#5B1717] underline underline-offset-4 hover:text-[#A83224]"
                  >
                    {dict.cancelCta}
                  </button>
                )}
              </div>

              <div className="bg-[#F8F3E9] rounded-lg border border-[#E9DDC9] p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5B1717]">
                  <MapPin className="w-4 h-4" />
                  {dict.contactHoursLabel}
                </div>
                <p className="text-sm font-medium text-[#29231F]">
                  {dict.contactHoursValue}
                </p>
                <p className="text-xs text-[#29231F]/70">
                  {dict.contactWindowLabel}: {dict.contactWindowValue}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* H. FOOTER */}
      <footer className="bg-[#29231F] text-[#E9DDC9] border-t border-[#B58A45]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.2em] uppercase text-[#B58A45] font-semibold">
              {dict.swamiSaranam}
            </p>
            <p className="font-editorial text-xl text-[#F8F3E9]">
              {data
                ? lang === "te"
                  ? data.temple.nameTe
                  : data.temple.name
                : dict.annadanamTitle}
            </p>
            <p className="text-xs text-[#E9DDC9]/70">
              {data?.temple.contactInfo}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <button
              type="button"
              onClick={() => toggleLang(lang === "te" ? "en" : "te")}
              className="text-[#E9DDC9] hover:text-white underline underline-offset-4"
            >
              {lang === "te" ? "Switch to English" : "తెలుగులో చూడండి"}
            </button>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-[#E9DDC9]/80 hover:text-white"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#B58A45]" />
              {dict.organizerLogin}
            </Link>
          </div>
        </div>
      </footer>

      {/* Self-Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-[#29231F]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F8F3E9] rounded-xl max-w-md w-full p-6 space-y-4 border border-[#E9DDC9] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-xl font-bold text-[#29231F]">
                {dict.cancelTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-[#29231F]/50 hover:text-[#29231F]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#29231F]/75">{dict.cancelSubtitle}</p>

            {cancelStatus && (
              <div
                className={`p-3 rounded-lg text-sm border ${
                  cancelStatus.type === "success"
                    ? "bg-[#52664B]/10 text-[#52664B] border-[#52664B]/30"
                    : "bg-[#A83224]/10 text-[#A83224] border-[#A83224]/30"
                }`}
              >
                {cancelStatus.msg}
              </div>
            )}

            <form onSubmit={handleVisitorCancel} className="space-y-3">
              <input
                type="text"
                required
                value={cancelCode}
                onChange={(e) => setCancelCode(e.target.value.toUpperCase())}
                placeholder={dict.enterCode}
                className="w-full rounded-lg border border-[#E9DDC9] bg-white px-3.5 py-3 text-base font-mono uppercase focus:outline-none focus:border-[#5B1717]"
              />
              <button
                type="submit"
                disabled={cancelling}
                className="w-full py-3 rounded-lg bg-[#A83224] hover:bg-[#8a281c] text-white font-semibold text-sm disabled:opacity-60"
              >
                {cancelling ? "..." : dict.cancelButton}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
