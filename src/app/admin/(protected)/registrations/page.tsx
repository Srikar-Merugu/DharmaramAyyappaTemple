"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface MemberItem {
  _id: string;
  fullName: string;
  phone: string | null;
  village: string | null;
  role: "leader" | "member";
  attendanceStatus: "pending" | "present" | "absent";
}

interface RegItem {
  _id: string;
  code: string;
  type: "individual" | "group";
  annadanamDate: string;
  batchId: string;
  groupName: string | null;
  leaderName: string | null;
  leaderPhone: string | null;
  leaderVillage: string | null;
  memberCount: number;
  status: "active" | "cancelled";
  source: "public_qr" | "admin_manual";
  overrideReason: string | null;
  createdAt: string;
  members: MemberItem[];
}

export default function AdminRegistrationsPage() {
  const [regs, setRegs] = useState<RegItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [showManual, setShowManual] = useState(false);
  const [manualType, setManualType] = useState<"individual" | "group">("individual");
  const [manualDate, setManualDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [manualBatch, setManualBatch] = useState("batch-1");
  const [manualMembers, setManualMembers] = useState([
    { fullName: "", phone: "", village: "" },
  ]);
  const [overrideRules, setOverrideRules] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  const [editing, setEditing] = useState<RegItem | null>(null);
  const [editMembers, setEditMembers] = useState<
    Array<{
      _id?: string;
      fullName: string;
      phone: string;
      village: string;
      role: "leader" | "member";
    }>
  >([]);
  const [editError, setEditError] = useState<string | null>(null);

  const loadRegs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (batchFilter !== "all") params.set("batchId", batchFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/registrations?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setRegs(json.registrations || []);
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter, batchFilter, typeFilter, statusFilter, search]);

  useEffect(() => {
    loadRegs();
  }, [loadRegs]);

  const handleCancel = async (reg: RegItem) => {
    if (!confirm(`Cancel registration ${reg.code} (${reg.memberCount} seats)?`)) {
      return;
    }
    const res = await fetch(`/api/admin/registrations/${reg._id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      loadRegs();
    } else {
      const j = await res.json();
      alert(j.error || "Failed to cancel");
    }
  };

  const openEdit = (reg: RegItem) => {
    setEditing(reg);
    setEditMembers(
      reg.members.map((m) => ({
        _id: m._id,
        fullName: m.fullName,
        phone: m.phone || "",
        village: m.village || "",
        role: m.role,
      }))
    );
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    const res = await fetch(`/api/admin/registrations/${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaderName: editing.leaderName,
        groupName: editing.groupName,
        members: editMembers.map((m) => ({
          _id: m._id,
          fullName: m.fullName,
          phone: m.phone || null,
          village: m.village || null,
          role: m.role,
        })),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setEditError(json.error || "Update failed");
      return;
    }
    setEditing(null);
    loadRegs();
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setSavingManual(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: manualType,
          annadanamDate: manualDate,
          batchId: manualBatch,
          leaderName:
            manualType === "group" ? manualMembers[0]?.fullName : null,
          members: manualMembers.map((m) => ({
            fullName: m.fullName,
            phone: m.phone || null,
            village: m.village || null,
          })),
          overrideRules,
          overrideReason: overrideRules ? overrideReason : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setManualError(json.error || "Failed to create");
        return;
      }
      setShowManual(false);
      setManualMembers([{ fullName: "", phone: "", village: "" }]);
      setOverrideRules(false);
      setOverrideReason("");
      loadRegs();
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#29231F]">
            Registrations
          </h1>
          <p className="text-sm text-[#29231F]/70">
            Search, view, edit, cancel, or add manual registrations
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Manual Registration
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#E9DDC9] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-[#29231F]/40 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, village, code..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E9DDC9] text-sm focus:outline-none focus:border-[#5B1717]"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
        />
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
        >
          <option value="all">All Batches</option>
          <option value="batch-1">Batch 1 (12:30 PM)</option>
          <option value="batch-2">Batch 2 (1:30 PM)</option>
          <option value="batch-3">Batch 3 (2:30 PM)</option>
        </select>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 rounded-lg border border-[#E9DDC9] px-2.5 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="group">Group</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 rounded-lg border border-[#E9DDC9] px-2.5 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
          Loading registrations...
        </div>
      ) : regs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
          No registrations found matching your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {regs.map((r) => {
            const isOpen = Boolean(expanded[r._id]);
            const primaryName =
              r.type === "group"
                ? r.groupName || r.leaderName || "Group"
                : r.members[0]?.fullName || "Devotee";
            return (
              <div
                key={r._id}
                className="bg-white rounded-xl border border-[#E9DDC9] overflow-hidden"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-[#E9DDC9] text-[#5B1717]">
                        {r.code}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F8F3E9] border border-[#E9DDC9] text-[#29231F] capitalize">
                        {r.type} ({r.memberCount})
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          r.status === "active"
                            ? "bg-[#52664B]/15 text-[#52664B]"
                            : "bg-[#A83224]/15 text-[#A83224]"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.overrideReason && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#B58A45]/20 text-[#5B1717]">
                          Override: {r.overrideReason}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-[#29231F] text-base">
                      {primaryName}
                    </div>
                    <div className="text-xs text-[#29231F]/70">
                      Date: <strong>{r.annadanamDate}</strong> • Batch:{" "}
                      <strong>{r.batchId}</strong>
                      {r.members[0]?.village ? ` • ${r.members[0].village}` : ""}
                      {r.members[0]?.phone ? ` • ${r.members[0].phone}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((p) => ({ ...p, [r._id]: !p[r._id] }))
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#E9DDC9] text-xs font-semibold flex items-center gap-1 hover:bg-[#F8F3E9]"
                    >
                      Members
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {r.status === "active" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="px-3 py-1.5 rounded-lg border border-[#B58A45]/60 text-[#5B1717] text-xs font-semibold flex items-center gap-1 hover:bg-[#F8F3E9]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(r)}
                          className="px-3 py-1.5 rounded-lg border border-[#A83224]/40 text-[#A83224] text-xs font-semibold flex items-center gap-1 hover:bg-[#A83224]/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[#E9DDC9] bg-[#F8F3E9]/60 px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {r.members.map((m) => (
                        <div
                          key={m._id}
                          className="bg-white rounded-lg p-2.5 border border-[#E9DDC9] text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-[#29231F]">
                              {m.fullName}
                              {m.role === "leader" && (
                                <span className="ml-1.5 text-[10px] text-[#5B1717] uppercase">
                                  (Leader)
                                </span>
                              )}
                            </div>
                            <div className="text-[#29231F]/65">
                              {m.phone || "No phone"}
                              {m.village ? ` • ${m.village}` : ""}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                              m.attendanceStatus === "present"
                                ? "bg-[#52664B]/15 text-[#52664B]"
                                : m.attendanceStatus === "absent"
                                ? "bg-[#A83224]/15 text-[#A83224]"
                                : "bg-[#E9DDC9] text-[#29231F]"
                            }`}
                          >
                            {m.attendanceStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Registration Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-[#29231F]/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#F8F3E9] rounded-xl max-w-lg w-full p-6 space-y-4 border border-[#E9DDC9] shadow-xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-xl font-semibold">
                Manual Organizer Registration
              </h3>
              <button type="button" onClick={() => setShowManual(false)}>
                <X className="w-5 h-5 text-[#29231F]/60" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-lg bg-[#A83224]/10 text-[#A83224] text-xs border border-[#A83224]/30">
                {manualError}
              </div>
            )}

            <form onSubmit={handleCreateManual} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={manualType}
                  onChange={(e) =>
                    setManualType(e.target.value as "individual" | "group")
                  }
                  className="rounded-lg border border-[#E9DDC9] bg-white px-2.5 py-2 text-sm"
                >
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                </select>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="rounded-lg border border-[#E9DDC9] bg-white px-2.5 py-2 text-sm"
                />
                <select
                  value={manualBatch}
                  onChange={(e) => setManualBatch(e.target.value)}
                  className="rounded-lg border border-[#E9DDC9] bg-white px-2.5 py-2 text-sm"
                >
                  <option value="batch-1">Batch 1 (12:30)</option>
                  <option value="batch-2">Batch 2 (1:30)</option>
                  <option value="batch-3">Batch 3 (2:30)</option>
                </select>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {manualMembers.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white border border-[#E9DDC9] space-y-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder={`Member ${idx + 1} Full Name *`}
                      value={m.fullName}
                      onChange={(e) =>
                        setManualMembers((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, fullName: e.target.value } : x
                          )
                        )
                      }
                      className="w-full rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        placeholder="Phone (optional)"
                        value={m.phone}
                        onChange={(e) =>
                          setManualMembers((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, phone: e.target.value } : x
                            )
                          )
                        }
                        className="rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Village (optional)"
                        value={m.village}
                        onChange={(e) =>
                          setManualMembers((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, village: e.target.value } : x
                            )
                          )
                        }
                        className="rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {manualType === "group" && (
                <button
                  type="button"
                  onClick={() =>
                    setManualMembers((p) => [
                      ...p,
                      { fullName: "", phone: "", village: "" },
                    ])
                  }
                  className="text-xs font-semibold text-[#5B1717] hover:underline"
                >
                  + Add another member
                </button>
              )}

              <div className="pt-2 border-t border-[#E9DDC9] space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#29231F]">
                  <input
                    type="checkbox"
                    checked={overrideRules}
                    onChange={(e) => setOverrideRules(e.target.checked)}
                    className="accent-[#5B1717]"
                  />
                  Override cutoff / capacity rules (logged in audit log)
                </label>
                {overrideRules && (
                  <input
                    type="text"
                    required
                    placeholder="Reason for override *"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full rounded-lg border border-[#B58A45] bg-white px-3 py-2 text-sm"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={savingManual}
                className="w-full py-3 rounded-lg bg-[#5B1717] text-[#F8F3E9] font-semibold text-sm"
              >
                {savingManual ? "Saving..." : "Create Registration"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-[#29231F]/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#F8F3E9] rounded-xl max-w-lg w-full p-6 space-y-4 border border-[#E9DDC9] shadow-xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-editorial text-xl font-semibold">
                Edit {editing.code}
              </h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="w-5 h-5 text-[#29231F]/60" />
              </button>
            </div>
            {editError && (
              <div className="p-3 rounded-lg bg-[#A83224]/10 text-[#A83224] text-xs border border-[#A83224]/30">
                {editError}
              </div>
            )}
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {editMembers.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white border border-[#E9DDC9] space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-[#5B1717]">
                        Member #{idx + 1}
                      </span>
                      {editMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditMembers((p) => p.filter((_, i) => i !== idx))
                          }
                          className="text-xs text-[#A83224] font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={m.fullName}
                      onChange={(e) =>
                        setEditMembers((p) =>
                          p.map((x, i) =>
                            i === idx ? { ...x, fullName: e.target.value } : x
                          )
                        )
                      }
                      className="w-full rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={m.phone}
                        onChange={(e) =>
                          setEditMembers((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, phone: e.target.value } : x
                            )
                          )
                        }
                        className="rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Village"
                        value={m.village}
                        onChange={(e) =>
                          setEditMembers((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, village: e.target.value } : x
                            )
                          )
                        }
                        className="rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {editing.type === "group" && (
                <button
                  type="button"
                  onClick={() =>
                    setEditMembers((p) => [
                      ...p,
                      { fullName: "", phone: "", village: "", role: "member" },
                    ])
                  }
                  className="text-xs font-semibold text-[#5B1717] hover:underline"
                >
                  + Add member
                </button>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-[#52664B] text-white font-semibold text-sm"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
