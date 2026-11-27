"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, Printer, QrCode, Save } from "lucide-react";

interface SettingsState {
  name: string;
  startDate: string;
  endDate: string;
  registrationEnabled: boolean;
  bookingWindowDays: number;
  cutoffTime: string;
  disabledDates: string[];
  templeName: string;
  templeNameTe: string;
  contactInfo: string;
  allowVisitorCancel: boolean;
  allowWalkinOverCapacity: boolean;
}

interface BatchState {
  batchId: string;
  name: string;
  nameTe: string;
  startTime: string;
  displayTime: string;
  capacity: number;
  active: boolean;
}

interface AuditItem {
  _id: string;
  adminEmail: string;
  action: string;
  recordType: string;
  recordId: string;
  note: string | null;
  timestamp: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [batches, setBatches] = useState<BatchState[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [newDisabledDate, setNewDisabledDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [qrUrl, setQrUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setSettings(json.settings);
      setBatches(json.batches || []);
      setAuditLogs(json.auditLogs || []);
    }
  }, []);

  useEffect(() => {
    load();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const regUrl = `${origin}/register`;
    setQrUrl(regUrl);
    fetch(`/api/admin/qr?url=${encodeURIComponent(regUrl)}`)
      .then((r) => r.json())
      .then((j) => setQrDataUrl(j.dataUrl || null))
      .catch(() => {});
  }, [load]);

  const regenerateQr = async () => {
    const res = await fetch(`/api/admin/qr?url=${encodeURIComponent(qrUrl)}`);
    if (res.ok) {
      const json = await res.json();
      setQrDataUrl(json.dataUrl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, batches }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Failed to save");
      } else {
        setMsg("Settings saved successfully.");
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-sm text-[#29231F]/60 border border-[#E9DDC9]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#29231F]">
        Season Settings & Permanent QR Code
      </h1>

      {msg && (
        <div className="p-3.5 rounded-lg bg-[#52664B]/10 border border-[#52664B]/30 text-[#52664B] text-sm font-semibold">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSave}
          className="lg:col-span-2 bg-white rounded-xl p-6 border border-[#E9DDC9] space-y-5 no-print"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Season Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Temple Name (English)
              </label>
              <input
                type="text"
                value={settings.templeName}
                onChange={(e) =>
                  setSettings({ ...settings, templeName: e.target.value })
                }
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Temple Name (Telugu)
              </label>
              <input
                type="text"
                value={settings.templeNameTe}
                onChange={(e) =>
                  setSettings({ ...settings, templeNameTe: e.target.value })
                }
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Season Start Date
              </label>
              <input
                type="date"
                value={settings.startDate}
                onChange={(e) =>
                  setSettings({ ...settings, startDate: e.target.value })
                }
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Season End Date
              </label>
              <input
                type="date"
                value={settings.endDate}
                onChange={(e) =>
                  setSettings({ ...settings, endDate: e.target.value })
                }
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Daily Cutoff Time (IST)
              </label>
              <input
                type="time"
                value={settings.cutoffTime}
                onChange={(e) =>
                  setSettings({ ...settings, cutoffTime: e.target.value })
                }
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70 mb-1">
                Contact Information
              </label>
              <input
                type="text"
                value={settings.contactInfo}
                onChange={(e) =>
                  setSettings({ ...settings, contactInfo: e.target.value })
                }
                className="w-full rounded-lg border border-[#E9DDC9] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E9DDC9]">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={settings.registrationEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    registrationEnabled: e.target.checked,
                  })
                }
                className="accent-[#5B1717]"
              />
              Enable Public Registrations
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={settings.allowVisitorCancel}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allowVisitorCancel: e.target.checked,
                  })
                }
                className="accent-[#5B1717]"
              />
              Allow Visitor Self-Cancellation (Before 9:00 AM Cutoff)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={settings.allowWalkinOverCapacity}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allowWalkinOverCapacity: e.target.checked,
                  })
                }
                className="accent-[#5B1717]"
              />
              Allow Walk-ins Even When Batch is Full (30/30)
            </label>
          </div>

          <div className="pt-2 border-t border-[#E9DDC9] space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#29231F]/70">
              Disabled Specific Dates
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDisabledDate}
                onChange={(e) => setNewDisabledDate(e.target.value)}
                className="rounded-lg border border-[#E9DDC9] px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (
                    newDisabledDate &&
                    !settings.disabledDates.includes(newDisabledDate)
                  ) {
                    setSettings({
                      ...settings,
                      disabledDates: [...settings.disabledDates, newDisabledDate],
                    });
                    setNewDisabledDate("");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#29231F] text-[#F8F3E9] text-xs font-semibold"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {settings.disabledDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A83224]/10 text-[#A83224] border border-[#A83224]/30 text-xs font-semibold"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        disabledDates: settings.disabledDates.filter(
                          (x) => x !== d
                        ),
                      })
                    }
                    className="font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E9DDC9] space-y-2.5">
            <h3 className="text-sm font-semibold text-[#29231F]">
              Batch Configuration
            </h3>
            {batches.map((b, idx) => (
              <div
                key={b.batchId}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg bg-[#F8F3E9] border border-[#E9DDC9]"
              >
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) =>
                    setBatches((p) =>
                      p.map((x, i) =>
                        i === idx ? { ...x, name: e.target.value } : x
                      )
                    )
                  }
                  className="rounded-lg border border-[#E9DDC9] px-2.5 py-1.5 text-xs bg-white"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={b.displayTime}
                  onChange={(e) =>
                    setBatches((p) =>
                      p.map((x, i) =>
                        i === idx ? { ...x, displayTime: e.target.value } : x
                      )
                    )
                  }
                  className="rounded-lg border border-[#E9DDC9] px-2.5 py-1.5 text-xs bg-white"
                  placeholder="12:30 PM"
                />
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={b.capacity}
                  onChange={(e) =>
                    setBatches((p) =>
                      p.map((x, i) =>
                        i === idx
                          ? { ...x, capacity: Number(e.target.value) || 30 }
                          : x
                      )
                    )
                  }
                  className="rounded-lg border border-[#E9DDC9] px-2.5 py-1.5 text-xs bg-white"
                />
                <label className="flex items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={b.active}
                    onChange={(e) =>
                      setBatches((p) =>
                        p.map((x, i) =>
                          i === idx ? { ...x, active: e.target.checked } : x
                        )
                      )
                    }
                    className="accent-[#5B1717]"
                  />
                  Active
                </label>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] font-semibold text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>

        {/* Permanent QR Poster */}
        <div className="bg-white rounded-xl p-6 border border-[#E9DDC9] space-y-4 text-center h-fit">
          <div className="flex items-center justify-center gap-2 text-[#5B1717] font-semibold">
            <QrCode className="w-5 h-5" />
            Permanent Temple QR Code
          </div>
          <p className="text-xs text-[#29231F]/70">
            Print and display at the temple entrance. Visitors scan this to register.
          </p>

          <div className="no-print flex gap-2">
            <input
              type="url"
              value={qrUrl}
              onChange={(e) => setQrUrl(e.target.value)}
              className="flex-1 rounded-lg border border-[#E9DDC9] px-2.5 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={regenerateQr}
              className="px-3 py-1.5 rounded-lg bg-[#29231F] text-[#F8F3E9] text-xs font-semibold"
            >
              Update
            </button>
          </div>

          {qrDataUrl && (
            <div className="p-4 rounded-xl border border-[#B58A45]/60 bg-[#F8F3E9] inline-block">
              <p className="text-xs font-semibold text-[#5B1717] mb-1">
                {settings.templeNameTe}
              </p>
              <img
                src={qrDataUrl}
                alt="Temple Annadanam QR Code"
                className="w-52 h-52 mx-auto rounded"
              />
              <p className="text-xs font-semibold text-[#29231F] mt-2">
                Scan for Annadanam Registration
              </p>
            </div>
          )}

          <div className="no-print flex gap-2 justify-center">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download="ayyappa-annadanam-qr.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#52664B] text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </a>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E9DDC9] text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Poster
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <section className="no-print bg-white rounded-xl p-5 border border-[#E9DDC9] space-y-3">
        <h2 className="font-editorial text-xl font-semibold text-[#29231F]">
          Recent Audit Log
        </h2>
        <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
          {auditLogs.map((l) => (
            <div
              key={l._id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[#E9DDC9]/60"
            >
              <div>
                <span className="font-mono font-bold text-[#5B1717]">
                  {l.action}
                </span>{" "}
                <span className="text-[#29231F]/70">
                  ({l.recordType}: {l.recordId})
                </span>
                {l.note && (
                  <span className="text-[#29231F]/60 ml-2">— {l.note}</span>
                )}
              </div>
              <div className="text-[#29231F]/50">
                {l.adminEmail} • {new Date(l.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
