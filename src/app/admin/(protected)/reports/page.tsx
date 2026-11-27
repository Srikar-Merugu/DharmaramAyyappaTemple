"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAdminLang } from "@/components/AdminLangContext";
import { Download, Printer } from "lucide-react";

interface ReportData {
  date: string;
  daily: {
    registered: number;
    attendedRegistered: number;
    noShows: number;
    pending: number;
    walkIns: number;
    actualAttendance: number;
    cancelledPeople: number;
    attendanceRate: number;
    batches: Array<{
      batchId: string;
      name: string;
      displayTime: string;
      capacity: number;
      registered: number;
      remaining: number;
      attendedRegistered: number;
      noShows: number;
      walkIns: number;
      actualAttendance: number;
      utilizationPct: number;
    }>;
  };
  season: {
    name: string;
    startDate: string;
    endDate: string;
    totalRegistrations: number;
    totalRegisteredPeople: number;
    totalAttendedRegistered: number;
    totalWalkIns: number;
    totalActualAttendance: number;
    individualRegs: number;
    groupRegs: number;
    repeatVisitorsCount: number;
    topRepeatVisitors: Array<{
      _id: string;
      profileCode: string;
      fullName: string;
      village: string | null;
      totalAttendedVisits: number;
    }>;
    villageBreakdown: Array<{ village: string; count: number }>;
  };
}

export default function AdminReportsPage() {
  const { at } = useAdminLang();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports?date=${encodeURIComponent(targetDate)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#29231F]">
            {at.reports.title}
          </h1>
          <p className="text-sm text-[#29231F]/70">
            {at.reports.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[#E9DDC9] bg-white px-3 py-2 text-sm font-semibold"
          />
          <a
            href={`/api/admin/reports?date=${encodeURIComponent(date)}&mode=export_daily`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#52664B] hover:bg-[#3f5039] text-white text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            Daily CSV
          </a>
          <a
            href="/api/admin/reports?mode=export_season"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            Season CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#E9DDC9] text-[#29231F] text-xs font-semibold hover:bg-[#F8F3E9]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-xl p-8 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
          Loading report...
        </div>
      ) : (
        <>
          <section className="bg-white rounded-xl p-5 border border-[#E9DDC9] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-xl font-semibold text-[#29231F]">
                Daily Service Report — {data.date}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E9DDC9] text-[#5B1717]">
                Attendance Rate: {data.daily.attendanceRate}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E9DDC9]">
                <div className="text-[11px] text-[#29231F]/60">Registered</div>
                <div className="text-xl font-bold">{data.daily.registered}</div>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#52664B]/40">
                <div className="text-[11px] text-[#52664B]">Attended (Reg)</div>
                <div className="text-xl font-bold text-[#52664B]">
                  {data.daily.attendedRegistered}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#B58A45]/50">
                <div className="text-[11px] text-[#5B1717]">Walk-ins</div>
                <div className="text-xl font-bold text-[#5B1717]">
                  {data.daily.walkIns}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#52664B]/10 border border-[#52664B]/40">
                <div className="text-[11px] text-[#52664B] font-semibold">
                  Actual Total
                </div>
                <div className="text-xl font-bold text-[#29231F]">
                  {data.daily.actualAttendance}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#A83224]/30">
                <div className="text-[11px] text-[#A83224]">No-shows</div>
                <div className="text-xl font-bold text-[#A83224]">
                  {data.daily.noShows}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E9DDC9]">
                <div className="text-[11px] text-[#29231F]/60">Cancelled</div>
                <div className="text-xl font-bold text-[#29231F]">
                  {data.daily.cancelledPeople}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E9DDC9] text-xs uppercase text-[#29231F]/60">
                    <th className="py-2.5 pr-4">Batch</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3">Registered</th>
                    <th className="py-2.5 px-3">Remaining</th>
                    <th className="py-2.5 px-3">Attended</th>
                    <th className="py-2.5 px-3">Walk-ins</th>
                    <th className="py-2.5 px-3">Actual</th>
                    <th className="py-2.5 pl-3">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9DDC9]/60">
                  {data.daily.batches.map((b) => (
                    <tr key={b.batchId}>
                      <td className="py-2.5 pr-4 font-semibold">
                        {b.name} ({b.displayTime})
                      </td>
                      <td className="py-2.5 px-3">{b.capacity}</td>
                      <td className="py-2.5 px-3 font-semibold">{b.registered}</td>
                      <td className="py-2.5 px-3">{b.remaining}</td>
                      <td className="py-2.5 px-3 text-[#52664B] font-semibold">
                        {b.attendedRegistered}
                      </td>
                      <td className="py-2.5 px-3 text-[#5B1717] font-semibold">
                        {b.walkIns}
                      </td>
                      <td className="py-2.5 px-3 font-bold">{b.actualAttendance}</td>
                      <td className="py-2.5 pl-3">{b.utilizationPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl p-5 border border-[#E9DDC9] space-y-4">
              <h2 className="font-editorial text-xl font-semibold text-[#29231F]">
                Season Overview ({data.season.startDate} to {data.season.endDate})
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E9DDC9]">
                  <div className="text-xs text-[#29231F]/60">Total Bookings</div>
                  <div className="text-2xl font-bold">
                    {data.season.totalRegistrations}
                  </div>
                  <div className="text-xs text-[#29231F]/60 mt-0.5">
                    {data.season.individualRegs} individual •{" "}
                    {data.season.groupRegs} group
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E9DDC9]">
                  <div className="text-xs text-[#29231F]/60">Registered Swamis</div>
                  <div className="text-2xl font-bold">
                    {data.season.totalRegisteredPeople}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#52664B]/10 border border-[#52664B]/30">
                  <div className="text-xs text-[#52664B]">
                    Total Actual Attendance
                  </div>
                  <div className="text-2xl font-bold text-[#52664B]">
                    {data.season.totalActualAttendance}
                  </div>
                  <div className="text-xs text-[#52664B] mt-0.5">
                    Includes {data.season.totalWalkIns} walk-ins
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#B58A45]/10 border border-[#B58A45]/40">
                  <div className="text-xs text-[#5B1717]">Repeat Visitors</div>
                  <div className="text-2xl font-bold text-[#5B1717]">
                    {data.season.repeatVisitorsCount}
                  </div>
                  <div className="text-xs text-[#5B1717]/80 mt-0.5">
                    2+ attended visits
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-[#E9DDC9] space-y-3">
              <h2 className="font-editorial text-xl font-semibold text-[#29231F]">
                Top Villages (Where Supplied)
              </h2>
              {data.season.villageBreakdown.length === 0 ? (
                <p className="text-sm text-[#29231F]/60">
                  No village data recorded yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {data.season.villageBreakdown.map((v) => (
                    <div
                      key={v.village}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-[#E9DDC9]/60"
                    >
                      <span className="font-medium text-[#29231F]">
                        {v.village}
                      </span>
                      <span className="font-semibold text-[#5B1717]">
                        {v.count} devotees
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
