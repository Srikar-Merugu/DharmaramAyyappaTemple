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
  Menu,
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

  const [regStep, setRegStep] = useState<
    "select" | "details" | "review" | "confirmed"
  >("select");
  const [regType, setRegType] = useState<"individual" | "group">("individual");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const [indName, setIndName] = useState("");
  const [indPhone, setIndPhone] = useState("");
  const [indVillage, setIndVillage] = useState("");

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
      if (!res.ok) throw new Error("Failed");
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
      setLoadError(lang === "te" ? "లోపం జరిగింది." : "Unable to load schedule.");
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
        setFormError(json.error || "Failed.");
        setRegStep("details");
        await fetchAvailability();
        return;
      }

      setConfirmation(json);
      setRegStep("confirmed");
      await fetchAvailability();
    } catch {
      setFormError("Network error.");
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
        setCancelStatus({ type: "error", msg: json.error || "Failed." });
      } else {
        setCancelStatus({ type: "success", msg: dict.cancelSuccess });
        setCancelCode("");
        await fetchAvailability();
      }
    } catch {
      setCancelStatus({ type: "error", msg: "Network error." });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#1F1B18]">
      {/* Minimal Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E7DFD3]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#5B1717] flex items-center justify-center shrink-0">
              <span className="font-editorial text-sm text-[#FAF7F2]">ॐ</span>
            </div>
            <span className="font-editorial text-lg sm:text-xl text-[#1F1B18] truncate">
              {data
                ? lang === "te"
                  ? data.temple.nameTe
                  : data.temple.name
                : dict.annadanamTitle}
            </span>
          </Link>

          <div className="flex items-center gap-4 shrink-0">
            {mode === "full" ? (
              <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-[#1F1B18]/75">
                <a href="#schedule" className="hover:text-[#5B1717]">
                  {dict.navSchedule}
                </a>
                <a href="#register" className="hover:text-[#5B1717]">
                  {dict.navRegister}
                </a>
              </nav>
            ) : (
              <Link
                href="/"
                className="hidden sm:inline text-sm font-medium text-[#1F1B18]/75 hover:text-[#5B1717]"
              >
                ← {dict.navHome}
              </Link>
            )}

            <div className="inline-flex items-center rounded-full border border-[#E7DFD3] bg-white p-0.5">
              <button
                type="button"
                onClick={() => toggleLang("te")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  lang === "te"
                    ? "bg-[#5B1717] text-[#FAF7F2]"
                    : "text-[#1F1B18]/70 hover:text-[#1F1B18]"
                }`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => toggleLang("en")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  lang === "en"
                    ? "bg-[#5B1717] text-[#FAF7F2]"
                    : "text-[#1F1B18]/70 hover:text-[#1F1B18]"
                }`}
              >
                EN
              </button>
            </div>

            {mode === "full" && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="sm:hidden p-1.5 rounded-lg border border-[#E7DFD3]"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {mobileMenuOpen && mode === "full" && (
          <nav className="sm:hidden border-t border-[#E7DFD3] bg-[#FAF7F2] px-4 py-2 flex gap-4 text-sm font-medium">
            <a
              href="#schedule"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2"
            >
              {dict.navSchedule}
            </a>
            <a
              href="#register"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2"
            >
              {dict.navRegister}
            </a>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {mode === "full" && (
          <>
            {/* HERO: Clean, Visual, Minimal Text */}
            <section className="relative h-[440px] sm:h-[500px] flex items-center bg-[#1F1B18] overflow-hidden">
              <Image
                src="/images/hero-temple.jpg"
                alt="Sri Ayyappa Swamy Temple"
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#1F1B18]/85 via-[#1F1B18]/55 to-transparent"
                aria-hidden="true"
              />
              <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 space-y-5">
                <p className="text-xs tracking-[0.2em] uppercase text-[#E7DFD3] font-semibold">
                  {dict.swamiSaranam}
                </p>
                <h1 className="font-editorial text-4xl sm:text-6xl text-[#FAF7F2] leading-[1.1] max-w-lg">
                  {dict.heroTitle}
                </h1>
                <p className="text-sm sm:text-base text-[#E7DFD3] font-medium tabular-nums">
                  {dict.heroSub}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href="#register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#FAF7F2] text-sm font-semibold transition"
                  >
                    {dict.heroPrimaryCta}
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#schedule"
                    className="px-5 py-3 rounded-lg border border-[#E7DFD3]/50 text-[#FAF7F2] hover:bg-white/10 text-sm font-medium transition"
                  >
                    {dict.heroSecondaryCta}
                  </a>
                </div>
              </div>
            </section>

            {/* VISUAL STRIP + LIVE SCHEDULE */}
            <section id="schedule" className="py-12 sm:py-16 border-b border-[#E7DFD3]">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10">
                {/* 2 Photos + 3 Key Facts */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div className="md:col-span-7 grid grid-cols-2 gap-4">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E7DFD3]">
                      <Image
                        src="/images/annadanam-meal.jpg"
                        alt="Annadanam Meal"
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, 30vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E7DFD3]">
                      <Image
                        src="/images/annadanam-lamps.jpg"
                        alt="Temple Lamps"
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, 30vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-5 grid grid-cols-1 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-[#E7DFD3] flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#5B1717]">
                        {dict.stat1Title}
                      </span>
                      <span className="text-xs text-[#1F1B18]/70 tabular-nums">
                        {dict.stat1Sub}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#E7DFD3] flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#5B1717]">
                        {dict.stat2Title}
                      </span>
                      <span className="text-xs text-[#1F1B18]/70 tabular-nums">
                        {dict.stat2Sub}
                      </span>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-[#E7DFD3] flex items-center justify-between">
                      <span className="font-semibold text-sm text-[#5B1717]">
                        {dict.stat3Title}
                      </span>
                      <span className="text-xs text-[#1F1B18]/70">
                        {dict.stat3Sub}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Batch Availability */}
                {data && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-editorial text-2xl sm:text-3xl text-[#1F1B18]">
                        {dict.timingsTitle}
                      </h2>
                      <span className="text-xs font-mono text-[#1F1B18]/60 tabular-nums">
                        IST {data.currentIST.timeStr}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {batchesForSelectedDate.map((b) => (
                        <div
                          key={b.batchId}
                          className="bg-white rounded-xl border border-[#E7DFD3] p-5 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#5B1717]">
                              {lang === "te" ? b.nameTe : b.name}
                            </div>
                            <div className="font-editorial text-2xl text-[#1F1B18] mt-0.5 tabular-nums">
                              {b.displayTime}
                            </div>
                          </div>
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full tabular-nums ${
                              b.isFull
                                ? "bg-[#A83224]/12 text-[#A83224]"
                                : "bg-[#4B6344]/12 text-[#4B6344]"
                            }`}
                          >
                            {b.isFull
                              ? dict.full
                              : `${b.remaining}/${b.capacity} ${dict.seatsLeft}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* REGISTRATION CARD */}
        <section
          id="register"
          className={mode === "register" ? "py-6 sm:py-10" : "py-12 sm:py-16"}
        >
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <h2 className="font-editorial text-2xl sm:text-3xl text-center text-[#1F1B18] mb-6">
              {dict.annadanamTitle}
            </h2>

            {loading && !data ? (
              <div className="bg-white rounded-xl border border-[#E7DFD3] p-8 text-center text-sm text-[#1F1B18]/60">
                ...
              </div>
            ) : loadError ? (
              <div className="bg-white rounded-xl border border-[#A83224]/30 p-6 text-center text-sm text-[#A83224]">
                {loadError}
              </div>
            ) : (
              data && (
                <div className="bg-white rounded-2xl border border-[#E7DFD3] p-5 sm:p-7 shadow-sm">
                  {regStep === "select" && (
                    <div className="space-y-6">
                      {formError && (
                        <div className="p-3 rounded-lg bg-[#A83224]/10 text-[#A83224] text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      )}

                      {/* 1. Type */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#1F1B18]/60 mb-2">
                          1. {dict.chooseType}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRegType("individual")}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                              regType === "individual"
                                ? "border-[#5B1717] bg-[#5B1717] text-[#FAF7F2]"
                                : "border-[#E7DFD3] bg-[#FAF7F2]/60 text-[#1F1B18] hover:border-[#B58A45]"
                            }`}
                          >
                            <span className="flex items-center gap-2 font-semibold text-sm">
                              <User className="w-4 h-4" />
                              {dict.individualTitle}
                            </span>
                            {regType === "individual" && (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setRegType("group")}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                              regType === "group"
                                ? "border-[#5B1717] bg-[#5B1717] text-[#FAF7F2]"
                                : "border-[#E7DFD3] bg-[#FAF7F2]/60 text-[#1F1B18] hover:border-[#B58A45]"
                            }`}
                          >
                            <span className="flex items-center gap-2 font-semibold text-sm">
                              <Users className="w-4 h-4" />
                              {dict.groupTitle}
                            </span>
                            {regType === "group" && (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 2. Date */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#1F1B18]/60 mb-2 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#5B1717]" />
                          2. {dict.selectDate}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                                className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                                  !d.available
                                    ? "bg-[#E7DFD3]/35 border-[#E7DFD3] text-[#1F1B18]/40 cursor-not-allowed"
                                    : isSelected
                                    ? "border-[#5B1717] bg-[#5B1717] text-[#FAF7F2]"
                                    : "border-[#E7DFD3] bg-[#FAF7F2]/60 text-[#1F1B18] hover:border-[#B58A45]"
                                }`}
                              >
                                <div>
                                  <div
                                    className={`text-[11px] font-semibold uppercase ${
                                      isSelected ? "text-[#E7DFD3]" : "text-[#5B1717]"
                                    }`}
                                  >
                                    {dayTag}
                                  </div>
                                  <div className="text-sm font-semibold mt-0.5">
                                    {formatDateLabel(d.date, lang)}
                                  </div>
                                  {!d.available && d.reason && (
                                    <div className="text-[11px] text-[#A83224] mt-0.5">
                                      {dict.reasons[d.reason]}
                                    </div>
                                  )}
                                </div>
                                {isSelected && d.available && (
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Batch */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#1F1B18]/60 mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#5B1717]" />
                          3. {dict.selectBatch}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                                className={`p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                                  disabled
                                    ? "bg-[#E7DFD3]/35 border-[#E7DFD3] text-[#1F1B18]/40 cursor-not-allowed"
                                    : isSelected
                                    ? "border-[#5B1717] bg-[#5B1717] text-[#FAF7F2]"
                                    : "border-[#E7DFD3] bg-[#FAF7F2]/60 text-[#1F1B18] hover:border-[#B58A45]"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`text-xs font-semibold ${
                                      isSelected ? "text-[#E7DFD3]" : "text-[#5B1717]"
                                    }`}
                                  >
                                    {lang === "te" ? b.nameTe : b.name}
                                  </span>
                                  {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <span
                                      className={`text-[11px] font-semibold tabular-nums ${
                                        b.isFull ? "text-[#A83224]" : "text-[#4B6344]"
                                      }`}
                                    >
                                      {b.isFull
                                        ? dict.full
                                        : `${b.remaining} ${dict.seatsLeft}`}
                                    </span>
                                  )}
                                </div>
                                <div className="font-editorial text-2xl mt-1 tabular-nums">
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
                        className="w-full py-3.5 rounded-xl bg-[#5B1717] hover:bg-[#3E0F0F] text-[#FAF7F2] font-semibold text-base transition flex items-center justify-center gap-2"
                      >
                        {dict.registerCta}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {regStep === "details" && (
                    <form onSubmit={handleProceedToReview} className="space-y-5">
                      <div className="flex items-center justify-between border-b border-[#E7DFD3] pb-3 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setRegStep("select");
                          }}
                          className="font-semibold text-[#5B1717]"
                        >
                          ← {dict.back}
                        </button>
                        <span className="font-medium text-[#1F1B18]/70">
                          {formatDateLabel(selectedDate, lang)} •{" "}
                          {selectedBatch?.displayTime}
                        </span>
                      </div>

                      {formError && (
                        <div className="p-3 rounded-lg bg-[#A83224]/10 text-[#A83224] text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{formError}</span>
                        </div>
                      )}

                      {regType === "individual" ? (
                        <div className="space-y-3.5">
                          <input
                            type="text"
                            required
                            value={indName}
                            onChange={(e) => setIndName(e.target.value)}
                            placeholder={dict.fullNamePlaceholder}
                            className="w-full rounded-xl border border-[#E7DFD3] bg-[#FAF7F2]/50 px-3.5 py-3 text-base focus:outline-none focus:border-[#5B1717]"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="tel"
                              inputMode="numeric"
                              value={indPhone}
                              onChange={(e) => setIndPhone(e.target.value)}
                              placeholder={dict.phone}
                              className="w-full rounded-xl border border-[#E7DFD3] bg-[#FAF7F2]/50 px-3.5 py-3 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                            <input
                              type="text"
                              value={indVillage}
                              onChange={(e) => setIndVillage(e.target.value)}
                              placeholder={dict.village}
                              className="w-full rounded-xl border border-[#E7DFD3] bg-[#FAF7F2]/50 px-3.5 py-3 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E7DFD3] space-y-3">
                            <div className="text-xs font-semibold uppercase text-[#5B1717]">
                              {dict.leaderDetails}
                            </div>
                            <input
                              type="text"
                              required
                              value={leaderName}
                              onChange={(e) => setLeaderName(e.target.value)}
                              placeholder={`${dict.leaderName} *`}
                              className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                            <div className="grid grid-cols-2 gap-2.5">
                              <input
                                type="tel"
                                inputMode="numeric"
                                value={leaderPhone}
                                onChange={(e) => setLeaderPhone(e.target.value)}
                                placeholder={dict.phone}
                                className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                              />
                              <input
                                type="text"
                                value={leaderVillage}
                                onChange={(e) => setLeaderVillage(e.target.value)}
                                placeholder={dict.village}
                                className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                              />
                            </div>
                            <input
                              type="text"
                              value={groupName}
                              onChange={(e) => setGroupName(e.target.value)}
                              placeholder={dict.groupNamePlaceholder}
                              className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                            />
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={leaderAttending}
                                onChange={(e) => setLeaderAttending(e.target.checked)}
                                className="w-4 h-4 accent-[#5B1717]"
                              />
                              <span>{dict.leaderAttending}</span>
                            </label>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>{dict.membersList}</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-[#E7DFD3] tabular-nums">
                                {dict.totalPeople}: {totalPeopleCount}
                              </span>
                            </div>

                            {groupMembers.map((m, idx) => (
                              <div
                                key={m.id}
                                className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DFD3] space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-[#5B1717]">
                                    #{idx + 1}
                                  </span>
                                  {(groupMembers.length > 1 || leaderAttending) && (
                                    <button
                                      type="button"
                                      onClick={() => removeMemberRow(m.id)}
                                      className="text-[#A83224] font-semibold flex items-center gap-1"
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
                                  placeholder={dict.fullNamePlaceholder}
                                  className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="tel"
                                    inputMode="numeric"
                                    value={m.phone}
                                    onChange={(e) =>
                                      updateMemberRow(m.id, "phone", e.target.value)
                                    }
                                    placeholder={dict.phone}
                                    className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
                                  />
                                  <input
                                    type="text"
                                    value={m.village}
                                    onChange={(e) =>
                                      updateMemberRow(m.id, "village", e.target.value)
                                    }
                                    placeholder={dict.village}
                                    className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#5B1717]"
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
                              className="w-full py-2.5 rounded-xl border border-dashed border-[#B58A45] text-[#5B1717] font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                            >
                              <Plus className="w-4 h-4" />
                              {dict.addMember}
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl bg-[#5B1717] hover:bg-[#3E0F0F] text-[#FAF7F2] font-semibold text-base transition"
                      >
                        {dict.reviewSubmit}
                      </button>
                    </form>
                  )}

                  {regStep === "review" && selectedBatch && (
                    <div className="space-y-5">
                      <h3 className="font-editorial text-2xl text-[#1F1B18]">
                        {dict.reviewTitle}
                      </h3>
                      <div className="rounded-xl bg-[#FAF7F2] border border-[#E7DFD3] p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#1F1B18]/65">{dict.dateLabel}</span>
                          <span className="font-semibold">
                            {formatDateLabel(selectedDate, lang)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#1F1B18]/65">{dict.batchLabel}</span>
                          <span className="font-semibold">
                            {selectedBatch.displayTime}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#1F1B18]/65">{dict.countLabel}</span>
                          <span className="font-semibold tabular-nums">
                            {totalPeopleCount}
                          </span>
                        </div>
                      </div>

                      <ul className="divide-y divide-[#E7DFD3] border border-[#E7DFD3] rounded-xl overflow-hidden text-sm">
                        {regType === "individual" ? (
                          <li className="px-4 py-2.5 font-medium">
                            {indName}
                            {indVillage ? ` • ${indVillage}` : ""}
                          </li>
                        ) : (
                          <>
                            {leaderAttending && (
                              <li className="px-4 py-2.5 font-medium bg-[#FAF7F2]">
                                {leaderName}
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

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => setRegStep("details")}
                          className="py-3 rounded-xl border border-[#E7DFD3] font-semibold text-sm"
                        >
                          {dict.back}
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={handleSubmitRegistration}
                          className="py-3 rounded-xl bg-[#4B6344] hover:bg-[#3a4d34] text-white font-semibold text-sm disabled:opacity-60"
                        >
                          {submitting ? dict.submitting : dict.submit}
                        </button>
                      </div>
                    </div>
                  )}

                  {regStep === "confirmed" && confirmation && (
                    <div className="space-y-5 text-center">
                      <div className="rounded-xl overflow-hidden border border-[#B58A45]/60 bg-[#FAF7F2]">
                        <div className="bg-[#5B1717] text-[#FAF7F2] px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="font-editorial text-2xl">
                              {dict.confirmedTitle}
                            </h3>
                          </div>
                        </div>

                        <div className="p-5 space-y-4">
                          <div>
                            <div className="text-xs uppercase tracking-wider text-[#5B1717] font-semibold">
                              {dict.regCode}
                            </div>
                            <div className="text-3xl font-mono font-bold tracking-widest text-[#1F1B18] mt-1">
                              {confirmation.code}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs bg-white p-3.5 rounded-lg border border-[#E7DFD3]">
                            <div>
                              <div className="text-[#1F1B18]/60">{dict.dateLabel}</div>
                              <div className="font-semibold mt-0.5">
                                {confirmation.annadanamDate}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#1F1B18]/60">{dict.batchLabel}</div>
                              <div className="font-semibold mt-0.5">
                                {data.batches.find(
                                  (b) => b.batchId === confirmation.batchId
                                )?.displayTime || confirmation.batchId}
                              </div>
                            </div>
                            <div>
                              <div className="text-[#1F1B18]/60">{dict.countLabel}</div>
                              <div className="font-semibold mt-0.5 tabular-nums">
                                {confirmation.memberCount}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-center gap-1.5">
                            {confirmation.members.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-md bg-white border border-[#E7DFD3] text-xs font-medium"
                              >
                                {m.fullName}
                              </span>
                            ))}
                          </div>

                          <p className="text-xs text-[#1F1B18]/65">
                            {dict.confirmedSubtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={resetRegistration}
                        className="w-full py-3 rounded-xl bg-[#5B1717] text-[#FAF7F2] font-semibold text-sm"
                      >
                        {dict.newRegistration}
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      </main>

      {/* Clean Single-Row Footer */}
      <footer className="border-t border-[#E7DFD3] bg-white/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#1F1B18]/70">
          <div className="font-medium">
            {dict.swamiSaranam} • {data?.temple.contactInfo}
          </div>
          <div className="flex items-center gap-5">
            {data?.temple.allowVisitorCancel && (
              <button
                type="button"
                onClick={() => {
                  setCancelStatus(null);
                  setShowCancelModal(true);
                }}
                className="text-[#5B1717] font-semibold hover:underline"
              >
                {dict.cancelCta}
              </button>
            )}
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1 hover:text-[#5B1717]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {dict.organizerLogin}
            </Link>
          </div>
        </div>
      </footer>

      {/* Self-Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-[#1F1B18]/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-xl max-w-sm w-full p-5 space-y-4 border border-[#E7DFD3] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-xl text-[#1F1B18]">
                {dict.cancelTitle}
              </h3>
              <button type="button" onClick={() => setShowCancelModal(false)}>
                <XCircle className="w-5 h-5 text-[#1F1B18]/50" />
              </button>
            </div>
            <p className="text-xs text-[#1F1B18]/70">{dict.cancelSubtitle}</p>

            {cancelStatus && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  cancelStatus.type === "success"
                    ? "bg-[#4B6344]/10 text-[#4B6344] border-[#4B6344]/30"
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
                className="w-full rounded-lg border border-[#E7DFD3] bg-white px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-[#5B1717]"
              />
              <button
                type="submit"
                disabled={cancelling}
                className="w-full py-2.5 rounded-lg bg-[#A83224] text-white font-semibold text-sm disabled:opacity-60"
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
