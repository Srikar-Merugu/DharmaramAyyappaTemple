"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAdminLang } from "@/components/AdminLangContext";
import { Calendar, Search, User } from "lucide-react";

interface ProfileItem {
  _id: string;
  profileCode: string;
  fullName: string;
  phone: string | null;
  village: string | null;
  totalAttendedVisits: number;
  lastAttendedDate: string | null;
}

interface ProfileDetail {
  profile: ProfileItem;
  regHistory: Array<{
    _id: string;
    annadanamDate: string;
    batchId: string;
    role: string;
    registrationStatus: string;
    attendanceStatus: string;
  }>;
  attHistory: Array<{
    _id: string;
    annadanamDate: string;
    batchId: string;
    source: string;
    status: string;
    markedAt: string;
  }>;
}

export default function AdminProfilesPage() {
  const { at } = useAdminLang();
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selected, setSelected] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/admin/profiles${qs}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setProfiles(json.profiles || []);
      }
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const openProfile = async (id: string) => {
    const res = await fetch(`/api/admin/profiles?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      setSelected(await res.json());
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#29231F]">
          {at.profiles.title}
        </h1>
        <p className="text-sm text-[#29231F]/70">
          {at.profiles.subtitle}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#29231F]/40 absolute left-3.5 top-3" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, village, SWM code..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-[#E9DDC9] text-sm focus:outline-none focus:border-[#5B1717]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-2.5">
          {loading ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
              Loading profiles...
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
              No profiles found.
            </div>
          ) : (
            profiles.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => openProfile(p._id)}
                className={`w-full text-left bg-white rounded-xl p-4 border transition flex items-center justify-between ${
                  selected?.profile._id === p._id
                    ? "border-[#5B1717] ring-1 ring-[#5B1717]"
                    : "border-[#E9DDC9] hover:border-[#B58A45]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E9DDC9]/70 text-[#5B1717] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#29231F]">{p.fullName}</div>
                    <div className="text-xs text-[#29231F]/65">
                      <span className="font-mono">{p.profileCode}</span>
                      {p.phone ? ` • ${p.phone}` : ""}
                      {p.village ? ` • ${p.village}` : ""}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-[#52664B]">
                    {p.totalAttendedVisits} visits
                  </div>
                  <div className="text-[11px] text-[#29231F]/60">
                    {p.lastAttendedDate
                      ? `Last: ${p.lastAttendedDate}`
                      : "No visits yet"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#E9DDC9] h-fit sticky top-32">
          {!selected ? (
            <div className="text-center py-8 text-sm text-[#29231F]/60">
              Select a Swami profile to view visit history.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#E9DDC9] text-[#5B1717] font-bold">
                  {selected.profile.profileCode}
                </span>
                <h2 className="font-editorial text-xl font-bold text-[#29231F] mt-1">
                  {selected.profile.fullName}
                </h2>
                <p className="text-xs text-[#29231F]/70">
                  {selected.profile.phone || "No mobile"} •{" "}
                  {selected.profile.village || "No village"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[#F8F3E9] rounded-lg p-3 border border-[#E9DDC9] text-center">
                <div>
                  <div className="text-[11px] text-[#29231F]/60">Total Attended</div>
                  <div className="text-xl font-bold text-[#52664B]">
                    {selected.profile.totalAttendedVisits}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#29231F]/60">Last Visit</div>
                  <div className="text-sm font-bold text-[#29231F] mt-1">
                    {selected.profile.lastAttendedDate || "—"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#29231F]/60 mb-2">
                  Registration & Attendance History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selected.regHistory.map((r) => (
                    <div
                      key={r._id}
                      className="p-2.5 rounded-lg bg-[#F8F3E9]/60 border border-[#E9DDC9] text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#5B1717]" />
                        <span className="font-semibold">{r.annadanamDate}</span>
                        <span className="text-[#29231F]/60">({r.batchId})</span>
                      </div>
                      <span
                        className={`font-semibold capitalize px-2 py-0.5 rounded-full ${
                          r.attendanceStatus === "present"
                            ? "bg-[#52664B]/15 text-[#52664B]"
                            : r.attendanceStatus === "absent"
                            ? "bg-[#A83224]/15 text-[#A83224]"
                            : "bg-[#E9DDC9] text-[#29231F]"
                        }`}
                      >
                        {r.registrationStatus === "cancelled"
                          ? "cancelled"
                          : r.attendanceStatus}
                      </span>
                    </div>
                  ))}
                  {selected.attHistory
                    .filter((a) => a.source === "walk-in")
                    .map((a) => (
                      <div
                        key={a._id}
                        className="p-2.5 rounded-lg bg-[#B58A45]/15 border border-[#B58A45]/40 text-xs flex items-center justify-between"
                      >
                        <span>
                          <strong>{a.annadanamDate}</strong> ({a.batchId})
                        </span>
                        <span className="font-semibold text-[#5B1717]">Walk-in</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
