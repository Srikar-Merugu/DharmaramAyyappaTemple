"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminLang } from "@/components/AdminLangContext";
import { Check, Clock, UserPlus, X } from "lucide-react";

interface AttMember {
  _id: string;
  profileId: string;
  fullName: string;
  phone: string | null;
  village: string | null;
  role: "leader" | "member";
  attendanceStatus: "pending" | "present" | "absent";
}

interface AttGroup {
  _id: string;
  code: string;
  type: "individual" | "group";
  groupName: string | null;
  leaderName: string | null;
  memberCount: number;
  members: AttMember[];
}

interface WalkInItem {
  _id: string;
  fullName: string;
  phone: string | null;
  village: string | null;
  markedAt: string;
}

function AttendanceContent() {
  const { at } = useAdminLang();
  const sp = useSearchParams();
  const [date, setDate] = useState(
    () => sp.get("date") || new Date().toISOString().slice(0, 10)
  );
  const [batchId, setBatchId] = useState(() => sp.get("batchId") || "batch-1");
  const [groups, setGroups] = useState<AttGroup[]>([]);
  const [walkIns, setWalkIns] = useState<WalkInItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wVillage, setWVillage] = useState("");
  const [wError, setWError] = useState<string | null>(null);
  const [addingWalkin, setAddingWalkin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/attendance?date=${encodeURIComponent(date)}&batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        setGroups(json.groups || []);
        setWalkIns(json.walkIns || []);
      }
    } finally {
      setLoading(false);
    }
  }, [date, batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const markMember = async (
    memberId: string,
    status: "present" | "absent" | "pending"
  ) => {
    await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_member", memberId, status }),
    });
    load();
  };

  const markGroup = async (
    registrationId: string,
    status: "present" | "absent"
  ) => {
    await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_group", registrationId, status }),
    });
    load();
  };

  const handleAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    setWError(null);
    setAddingWalkin(true);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "walkin",
          annadanamDate: date,
          batchId,
          fullName: wName,
          phone: wPhone || null,
          village: wVillage || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setWError(json.error || "Failed to add walk-in");
        return;
      }
      setWName("");
      setWPhone("");
      setWVillage("");
      load();
    } finally {
      setAddingWalkin(false);
    }
  };

  const allMembers = groups.flatMap((g) => g.members);
  const presentReg = allMembers.filter(
    (m) => m.attendanceStatus === "present"
  ).length;
  const absentReg = allMembers.filter(
    (m) => m.attendanceStatus === "absent"
  ).length;
  const pendingReg = allMembers.filter(
    (m) => m.attendanceStatus === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#1F1B18]">
            {at.attendance.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[#E9DDC9] bg-white px-3 py-2 text-sm font-semibold"
          />
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="rounded-lg border border-[#E9DDC9] bg-white px-3 py-2 text-sm font-semibold"
          >
            <option value="batch-1">Batch 1 (12:30 PM)</option>
            <option value="batch-2">Batch 2 (1:30 PM)</option>
            <option value="batch-3">Batch 3 (2:30 PM)</option>
          </select>
        </div>
      </div>

      {/* Live Batch Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-[#E9DDC9]">
          <div className="text-xs text-[#29231F]/60">Registered</div>
          <div className="text-2xl font-bold">{allMembers.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-[#52664B]/40">
          <div className="text-xs text-[#52664B] font-medium">Present (Reg)</div>
          <div className="text-2xl font-bold text-[#52664B]">{presentReg}</div>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-[#B58A45]/50">
          <div className="text-xs text-[#5B1717] font-medium">Walk-ins</div>
          <div className="text-2xl font-bold text-[#5B1717]">
            {walkIns.length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-[#E9DDC9]">
          <div className="text-xs text-[#29231F]/60">Pending</div>
          <div className="text-2xl font-bold text-[#B58A45]">{pendingReg}</div>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-[#A83224]/30">
          <div className="text-xs text-[#A83224] font-medium">No-shows</div>
          <div className="text-2xl font-bold text-[#A83224]">{absentReg}</div>
        </div>
      </div>

      {/* Fast Walk-in Entry */}
      <section className="bg-white rounded-xl p-5 border border-[#E9DDC9]">
        <h2 className="text-sm font-semibold text-[#5B1717] mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Quick Walk-in Entry (Recorded as Present)
        </h2>
        {wError && (
          <div className="mb-3 p-2.5 rounded-lg bg-[#A83224]/10 text-[#A83224] text-xs border border-[#A83224]/30">
            {wError}
          </div>
        )}
        <form
          onSubmit={handleAddWalkin}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2.5"
        >
          <input
            type="text"
            required
            placeholder="Swami / Devotee Name *"
            value={wName}
            onChange={(e) => setWName(e.target.value)}
            className="rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder="Mobile (optional)"
            value={wPhone}
            onChange={(e) => setWPhone(e.target.value)}
            className="rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Village (optional)"
            value={wVillage}
            onChange={(e) => setWVillage(e.target.value)}
            className="rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addingWalkin}
            className="rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] font-semibold text-sm py-2 px-4"
          >
            {addingWalkin ? "Adding..." : "+ Record Walk-in"}
          </button>
        </form>
      </section>

      {/* Registered Check-in List */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[#29231F]">
          Registered Devotees ({groups.length})
        </h2>
        {loading ? (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
            Loading batch list...
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
            No active registrations for this date and batch.
          </div>
        ) : (
          groups.map((g) => (
            <div
              key={g._id}
              className="bg-white rounded-xl border border-[#E9DDC9] overflow-hidden"
            >
              <div className="bg-[#F8F3E9] px-4 py-3 border-b border-[#E9DDC9] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E9DDC9] text-[#5B1717]">
                    {g.code}
                  </span>
                  <span className="text-sm font-semibold text-[#29231F]">
                    {g.type === "group"
                      ? g.groupName || `${g.leaderName}'s Group`
                      : g.members[0]?.fullName}
                  </span>
                  <span className="text-xs text-[#29231F]/60">
                    ({g.memberCount})
                  </span>
                </div>

                {g.type === "group" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markGroup(g._id, "present")}
                      className="px-2.5 py-1 rounded-lg bg-[#52664B] text-white text-xs font-semibold hover:bg-[#3f5039]"
                    >
                      Mark All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => markGroup(g._id, "absent")}
                      className="px-2.5 py-1 rounded-lg bg-[#A83224] text-white text-xs font-semibold hover:bg-[#8a281c]"
                    >
                      Mark All Absent
                    </button>
                  </div>
                )}
              </div>

              <div className="divide-y divide-[#E9DDC9]/60">
                {g.members.map((m) => (
                  <div
                    key={m._id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-sm text-[#29231F]">
                        {m.fullName}
                        {m.role === "leader" && (
                          <span className="ml-1.5 text-[11px] text-[#5B1717] font-semibold">
                            (Leader)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#29231F]/60">
                        {m.phone || "No phone"}
                        {m.village ? ` • ${m.village}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => markMember(m._id, "present")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                          m.attendanceStatus === "present"
                            ? "bg-[#52664B] text-white border-[#52664B]"
                            : "bg-white text-[#29231F] border-[#E9DDC9] hover:bg-[#52664B]/10"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => markMember(m._id, "absent")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                          m.attendanceStatus === "absent"
                            ? "bg-[#A83224] text-white border-[#A83224]"
                            : "bg-white text-[#29231F] border-[#E9DDC9] hover:bg-[#A83224]/10"
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => markMember(m._id, "pending")}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                          m.attendanceStatus === "pending"
                            ? "bg-[#29231F] text-white border-[#29231F]"
                            : "bg-white text-[#29231F]/70 border-[#E9DDC9]"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Walk-ins List */}
      {walkIns.length > 0 && (
        <section className="bg-white rounded-xl p-5 border border-[#E9DDC9] space-y-3">
          <h2 className="text-base font-semibold text-[#29231F]">
            Walk-in Attendees ({walkIns.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {walkIns.map((w) => (
              <div
                key={w._id}
                className="p-3 rounded-lg bg-[#F8F3E9] border border-[#E9DDC9] text-sm"
              >
                <div className="font-semibold text-[#29231F]">{w.fullName}</div>
                <div className="text-xs text-[#29231F]/65">
                  {w.phone || "No phone"}
                  {w.village ? ` • ${w.village}` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function AdminAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-xl p-6 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
          Loading attendance...
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
