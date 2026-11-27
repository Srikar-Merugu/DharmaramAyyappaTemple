"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

interface OverviewData {
  date: string;
  today: string;
  upcomingCounts?: Array<{
    date: string;
    label: string;
    expectedCount: number;
  }>;
  settings: {
    name: string;
    registrationEnabled: boolean;
    cutoffTime: string;
    disabledDates: string[];
  };
  summary: {
    totalExpected: number;
    individualRegs: number;
    groupRegs: number;
    cancelledRegs: number;
    cancelledPeople: number;
    attendedRegistered: number;
    noShows: number;
    pending: number;
    walkInCount: number;
    actualAttendance: number;
    totalCapacity: number;
  };
  batches: Array<{
    batchId: string;
    name: string;
    nameTe: string;
    displayTime: string;
    capacity: number;
    bookedCount: number;
    remaining: number;
    isFull: boolean;
    attendedRegistered: number;
    noShows: number;
    pending: number;
    walkIns: number;
  }>;
}

export default function AdminOverviewPage() {
  const [date, setDate] = useState<string>("");
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetDate?: string) => {
    setLoading(true);
    try {
      const qs = targetDate ? `?date=${encodeURIComponent(targetDate)}` : "";
      const res = await fetch(`/api/admin/overview${qs}`, { cache: "no-store" });
      if (res.ok) {
        const json: OverviewData = await res.json();
        setData(json);
        if (!targetDate) setDate(json.date);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    load(newDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#29231F]">
            Daily Annadanam Overview
          </h1>
          <p className="text-sm text-[#29231F]/70">
            {data?.settings.name || "Ayyappa Season"} • Cutoff{" "}
            {data?.settings.cutoffTime || "09:00"} IST
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-[#E9DDC9] rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-[#5B1717]" />
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-sm font-semibold focus:outline-none bg-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => load(date)}
            className="p-2.5 rounded-lg bg-white border border-[#E9DDC9] hover:bg-[#E9DDC9]/40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-[#5B1717] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {data && (
        <>
          {data.upcomingCounts && (
            <div className="flex flex-wrap items-center gap-2">
              {data.upcomingCounts.map((u) => {
                const active = u.date === date;
                return (
                  <button
                    key={u.date}
                    type="button"
                    onClick={() => handleDateChange(u.date)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-2 ${
                      active
                        ? "bg-[#5B1717] text-[#F8F3E9] border-[#5B1717]"
                        : "bg-white text-[#29231F] border-[#E9DDC9] hover:border-[#B58A45]"
                    }`}
                  >
                    <span>
                      {u.label} ({u.date.slice(5)})
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                        active
                          ? "bg-[#F8F3E9] text-[#5B1717]"
                          : u.expectedCount > 0
                          ? "bg-[#52664B]/15 text-[#52664B]"
                          : "bg-[#E9DDC9]/60 text-[#29231F]/60"
                      }`}
                    >
                      {u.expectedCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#E9DDC9]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#29231F]/65 uppercase tracking-wider">
                Expected Registered
                <Users className="w-4 h-4 text-[#5B1717]" />
              </div>
              <div className="text-3xl font-bold text-[#29231F] mt-2">
                {data.summary.totalExpected}
                <span className="text-sm font-medium text-[#29231F]/45">
                  {" "}
                  / {data.summary.totalCapacity}
                </span>
              </div>
              <div className="text-xs text-[#29231F]/70 mt-1">
                {data.summary.individualRegs} individual •{" "}
                {data.summary.groupRegs} group
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E9DDC9]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#29231F]/65 uppercase tracking-wider">
                Actual Attendance
                <UserCheck className="w-4 h-4 text-[#52664B]" />
              </div>
              <div className="text-3xl font-bold text-[#52664B] mt-2">
                {data.summary.actualAttendance}
              </div>
              <div className="text-xs text-[#29231F]/70 mt-1">
                {data.summary.attendedRegistered} registered +{" "}
                {data.summary.walkInCount} walk-ins
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E9DDC9]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#29231F]/65 uppercase tracking-wider">
                Walk-ins
                <UserPlus className="w-4 h-4 text-[#B58A45]" />
              </div>
              <div className="text-3xl font-bold text-[#29231F] mt-2">
                {data.summary.walkInCount}
              </div>
              <div className="text-xs text-[#29231F]/70 mt-1">
                Recorded directly at service
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E9DDC9]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#29231F]/65 uppercase tracking-wider">
                No-shows / Cancelled
                <XCircle className="w-4 h-4 text-[#A83224]" />
              </div>
              <div className="text-3xl font-bold text-[#29231F] mt-2">
                {data.summary.noShows}
                <span className="text-sm font-medium text-[#29231F]/45">
                  {" "}
                  / {data.summary.cancelledPeople}
                </span>
              </div>
              <div className="text-xs text-[#29231F]/70 mt-1">
                {data.summary.pending} pending check-in
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.batches.map((b) => {
              const pct = Math.min(
                100,
                Math.round((b.bookedCount / b.capacity) * 100)
              );
              return (
                <div
                  key={b.batchId}
                  className="bg-white rounded-xl p-5 border border-[#E9DDC9] flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#5B1717]">
                          {b.name} • {b.nameTe}
                        </span>
                        <h3 className="font-editorial text-2xl font-bold text-[#29231F] flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-4 h-4 text-[#B58A45]" />
                          {b.displayTime}
                        </h3>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          b.isFull
                            ? "bg-[#A83224]/15 text-[#A83224]"
                            : "bg-[#52664B]/15 text-[#52664B]"
                        }`}
                      >
                        {b.isFull ? "FULL" : `${b.remaining} left`}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-medium text-[#29231F]/75 mb-1">
                        <span>
                          Registered: {b.bookedCount} / {b.capacity}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#E9DDC9] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            b.isFull ? "bg-[#A83224]" : "bg-[#52664B]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center bg-[#F8F3E9] rounded-lg p-2.5 border border-[#E9DDC9]">
                      <div>
                        <div className="text-[11px] text-[#29231F]/60">Present</div>
                        <div className="text-sm font-bold text-[#52664B]">
                          {b.attendedRegistered + b.walkIns}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#29231F]/60">Pending</div>
                        <div className="text-sm font-bold text-[#B58A45]">
                          {b.pending}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#29231F]/60">No-show</div>
                        <div className="text-sm font-bold text-[#A83224]">
                          {b.noShows}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/admin/attendance?date=${data.date}&batchId=${b.batchId}`}
                    className="w-full py-2.5 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#E9DDC9]" />
                    Mark Attendance & Walk-ins
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
