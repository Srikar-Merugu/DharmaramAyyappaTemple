"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  QrCode,
  Smartphone,
  UserCheck,
} from "lucide-react";

interface TempleInfo {
  templeName: string;
  templeNameTe: string;
  contactInfo: string;
  cutoffTime: string;
  name: string;
}

export default function AdminPostersPage() {
  const [activePoster, setActivePoster] = useState<"qr" | "workflow">("qr");
  const [qrUrl, setQrUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [temple, setTemple] = useState<TempleInfo>({
    templeName: "Sri Ayyappa Swamy Temple",
    templeNameTe: "శ్రీ అయ్యప్ప స్వామి దేవాలయం",
    contactInfo: "+91 98765 43210 • Temple Annadanam Office",
    cutoffTime: "09:00",
    name: "Ayyappa Season",
  });

  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const regUrl = `${origin}/register`;
    setQrUrl(regUrl);

    fetch(`/api/admin/qr?url=${encodeURIComponent(regUrl)}`)
      .then((r) => r.json())
      .then((j) => setQrDataUrl(j.dataUrl || null))
      .catch(() => {});

    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.settings) {
          setTemple({
            templeName: j.settings.templeName,
            templeNameTe: j.settings.templeNameTe,
            contactInfo: j.settings.contactInfo,
            cutoffTime: j.settings.cutoffTime,
            name: j.settings.name,
          });
        }
      })
      .catch(() => {});
  }, []);

  const updateQr = async () => {
    const res = await fetch(`/api/admin/qr?url=${encodeURIComponent(qrUrl)}`);
    if (res.ok) {
      const j = await res.json();
      setQrDataUrl(j.dataUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar (Hidden when printing) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E9DDC9]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePoster("qr")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activePoster === "qr"
                ? "bg-[#5B1717] text-[#F8F3E9]"
                : "bg-[#F8F3E9] text-[#29231F] border border-[#E9DDC9]"
            }`}
          >
            <QrCode className="w-4 h-4" />
            1. Temple QR Poster (A4)
          </button>
          <button
            type="button"
            onClick={() => setActivePoster("workflow")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activePoster === "workflow"
                ? "bg-[#5B1717] text-[#F8F3E9]"
                : "bg-[#F8F3E9] text-[#29231F] border border-[#E9DDC9]"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            2. Swami Booking Workflow (A4)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activePoster === "qr" && (
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={qrUrl}
                onChange={(e) => setQrUrl(e.target.value)}
                className="rounded-lg border border-[#E9DDC9] px-2.5 py-1.5 text-xs w-56"
              />
              <button
                type="button"
                onClick={updateQr}
                className="px-3 py-1.5 rounded-lg bg-[#29231F] text-white text-xs font-semibold"
              >
                Update URL
              </button>
            </div>
          )}
          {qrDataUrl && activePoster === "qr" && (
            <a
              href={qrDataUrl}
              download="ayyappa-annadanam-qr-poster.png"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#52664B] text-white text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              QR PNG
            </a>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5B1717] hover:bg-[#3E0F0F] text-[#F8F3E9] text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            Print / Save A4 PDF
          </button>
        </div>
      </div>

      {/* POSTER 1: BIG TEMPLE QR POSTER */}
      {activePoster === "qr" && (
        <div className="mx-auto max-w-[794px] bg-[#F8F3E9] border-[6px] border-[#5B1717] rounded-2xl overflow-hidden shadow-lg print:shadow-none print:border-[4px] print:rounded-none">
          {/* Top Temple Hero Banner */}
          <div className="relative h-56 bg-[#29231F] overflow-hidden">
            <img
              src="/images/hero-temple.jpg"
              alt="Ayyappa Temple"
              className="w-full h-full object-cover object-center opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#5B1717] via-[#29231F]/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-center text-[#F8F3E9]">
              <p className="text-xs tracking-[0.25em] uppercase text-[#E9DDC9] font-semibold">
                స్వామియే శరణం అయ్యప్ప • SWAMIYE SARANAM AYYAPPA
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-bold mt-1">
                {temple.templeNameTe}
              </h2>
              <p className="text-sm text-[#E9DDC9] font-medium">
                {temple.templeName}
              </p>
            </div>
          </div>

          {/* Gold Ornamental Rule */}
          <div className="h-1.5 bg-[#B58A45]" />

          {/* Main QR Body */}
          <div className="p-8 text-center space-y-6">
            <div className="space-y-1">
              <div className="inline-block px-4 py-1 rounded-full bg-[#5B1717] text-[#F8F3E9] text-xs font-semibold tracking-wider uppercase">
                అన్నదానం మహాదానం • Daily Annadanam Seva
              </div>
              <h3 className="font-editorial text-3xl font-bold text-[#29231F] pt-2">
                అన్నదానం నమోదు కోసం స్కాన్ చేయండి
              </h3>
              <p className="text-base font-semibold text-[#5B1717]">
                Scan QR Code for Annadanam Registration
              </p>
            </div>

            {/* Large Centered QR Frame */}
            <div className="inline-block p-5 bg-white rounded-2xl border-2 border-[#B58A45] shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Annadanam Registration QR Code"
                  className="w-64 h-64 sm:w-72 sm:h-72 mx-auto"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-sm text-[#29231F]/50">
                  Generating QR...
                </div>
              )}
              <p className="mt-3 text-xs font-mono text-[#29231F]/70 break-all max-w-xs mx-auto">
                {qrUrl}
              </p>
            </div>

            {/* Batch Timings Strip */}
            <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
              <div className="bg-white rounded-xl p-3 border border-[#E9DDC9]">
                <div className="text-[11px] font-bold text-[#5B1717] uppercase">
                  బ్యాచ్ 1 • Batch 1
                </div>
                <div className="font-editorial text-2xl font-bold text-[#29231F]">
                  12:30 PM
                </div>
                <div className="text-[11px] text-[#52664B] font-semibold">
                  Max 30 Swamis
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#E9DDC9]">
                <div className="text-[11px] font-bold text-[#5B1717] uppercase">
                  బ్యాచ్ 2 • Batch 2
                </div>
                <div className="font-editorial text-2xl font-bold text-[#29231F]">
                  1:30 PM
                </div>
                <div className="text-[11px] text-[#52664B] font-semibold">
                  Max 30 Swamis
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#E9DDC9]">
                <div className="text-[11px] font-bold text-[#5B1717] uppercase">
                  బ్యాచ్ 3 • Batch 3
                </div>
                <div className="font-editorial text-2xl font-bold text-[#29231F]">
                  2:30 PM
                </div>
                <div className="text-[11px] text-[#52664B] font-semibold">
                  Max 30 Swamis
                </div>
              </div>
            </div>

            {/* Footer Rules & Supporting Image */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 border border-[#E9DDC9] text-left max-w-xl mx-auto">
              <img
                src="/images/annadanam-meal.jpg"
                alt="Traditional Annadanam Meal"
                className="w-24 h-20 object-cover rounded-lg border border-[#E9DDC9] shrink-0"
              />
              <div className="text-xs space-y-1 text-[#29231F]">
                <p className="font-bold text-[#5B1717]">
                  • ప్రతి రోజు ఉదయం 9:00 గంటల లోపు నమోదు చేసుకోండి
                </p>
                <p className="text-[#29231F]/80">
                  • Same-day registration closes at {temple.cutoffTime} AM IST.
                </p>
                <p className="text-[#29231F]/70">{temple.contactInfo}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POSTER 2: SWAMI BOOKING WORKFLOW GUIDE */}
      {activePoster === "workflow" && (
        <div className="mx-auto max-w-[794px] bg-[#F8F3E9] border-[6px] border-[#5B1717] rounded-2xl overflow-hidden shadow-lg print:shadow-none print:border-[4px] print:rounded-none">
          {/* Header */}
          <div className="bg-[#5B1717] text-[#F8F3E9] p-6 text-center border-b-4 border-[#B58A45]">
            <p className="text-xs tracking-[0.22em] uppercase text-[#E9DDC9]">
              స్వామియే శరణం అయ్యప్ప • SWAMIYE SARANAM AYYAPPA
            </p>
            <h2 className="font-editorial text-3xl font-bold mt-1">
              అన్నదానం నమోదు విధానం
            </h2>
            <p className="text-base text-[#E9DDC9] font-medium">
              How to Book Annadanam — 4 Simple Steps
            </p>
          </div>

          <div className="p-7 space-y-5">
            {/* 4 Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Step 1 */}
              <div className="bg-white rounded-xl p-5 border-2 border-[#E9DDC9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-full bg-[#5B1717] text-[#F8F3E9] font-bold flex items-center justify-center text-lg">
                    1
                  </span>
                  <QrCode className="w-7 h-7 text-[#B58A45]" />
                </div>
                <h3 className="font-bold text-base text-[#5B1717]">
                  క్యూఆర్ కోడ్ స్కాన్ చేయండి
                </h3>
                <p className="font-semibold text-sm text-[#29231F]">
                  Scan the Temple QR Code
                </p>
                <p className="text-xs text-[#29231F]/75 leading-relaxed">
                  మీ ఫోన్ కెమెరాతో దేవాలయ క్యూఆర్ కోడ్‌ను స్కాన్ చేయండి. యాప్ డౌన్‌లోడ్ అవసరం లేదు.
                  <br />
                  Open your phone camera and scan the QR code. No app install needed.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white rounded-xl p-5 border-2 border-[#E9DDC9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-full bg-[#5B1717] text-[#F8F3E9] font-bold flex items-center justify-center text-lg">
                    2
                  </span>
                  <CalendarCheck className="w-7 h-7 text-[#B58A45]" />
                </div>
                <h3 className="font-bold text-base text-[#5B1717]">
                  రకం, తేదీ & బ్యాచ్ ఎంచుకోండి
                </h3>
                <p className="font-semibold text-sm text-[#29231F]">
                  Choose Type, Date & Batch
                </p>
                <p className="text-xs text-[#29231F]/75 leading-relaxed">
                  వ్యక్తిగత లేదా సమూహ నమోదు ఎంచుకుని, తేదీ (ఈ రోజు / రేపు / ఎల్లుండి) మరియు బ్యాచ్ (12:30, 1:30, 2:30) ఎంచుకోండి.
                  <br />
                  Select Individual or Group, choose an available date, and pick a batch.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white rounded-xl p-5 border-2 border-[#E9DDC9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-full bg-[#5B1717] text-[#F8F3E9] font-bold flex items-center justify-center text-lg">
                    3
                  </span>
                  <UserCheck className="w-7 h-7 text-[#B58A45]" />
                </div>
                <h3 className="font-bold text-base text-[#5B1717]">
                  పేరు నమోదు చేసి నిర్ధారించండి
                </h3>
                <p className="font-semibold text-sm text-[#29231F]">
                  Enter Name & Confirm
                </p>
                <p className="text-xs text-[#29231F]/75 leading-relaxed">
                  మీ పేరు నమోదు చేయండి (మొబైల్ & గ్రామం ఐచ్ఛికం). సమూహమైతే సభ్యుల పేర్లు జోడించండి.
                  <br />
                  Enter full name (mobile & village optional). For groups, add each member.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white rounded-xl p-5 border-2 border-[#E9DDC9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-full bg-[#52664B] text-white font-bold flex items-center justify-center text-lg">
                    4
                  </span>
                  <CheckCircle2 className="w-7 h-7 text-[#52664B]" />
                </div>
                <h3 className="font-bold text-base text-[#52664B]">
                  నిర్ధారణ కోడ్ సేవ్ చేసుకోండి
                </h3>
                <p className="font-semibold text-sm text-[#29231F]">
                  Screenshot Confirmation Code
                </p>
                <p className="text-xs text-[#29231F]/75 leading-relaxed">
                  నమోదు కోడ్ (AYY-XXXXXX) స్క్రీన్‌షాట్ తీసుకొని మీ బ్యాచ్ సమయానికి అన్నదాన హాల్‌కు రండి.
                  <br />
                  Take a screenshot of your AYY-XXXXXX code and arrive at your batch time.
                </p>
              </div>
            </div>

            {/* Bottom Rules + Photo Strip */}
            <div className="bg-white rounded-xl p-4 border border-[#E9DDC9] flex flex-col sm:flex-row items-center gap-4">
              <img
                src="/images/annadanam-lamps.jpg"
                alt="Temple Lamps"
                className="w-28 h-24 object-cover rounded-lg border border-[#E9DDC9] shrink-0"
              />
              <div className="space-y-1.5 text-xs text-[#29231F]">
                <div className="flex items-center gap-1.5 font-bold text-[#5B1717]">
                  <Clock className="w-4 h-4" />
                  ముఖ్య గమనిక • Important Guidelines
                </div>
                <p>
                  • ప్రతి బ్యాచ్‌కు గరిష్టంగా 30 మంది మాత్రమే (12:30 PM, 1:30 PM, 2:30 PM).
                </p>
                <p>
                  • ఆ రోజు నమోదు ఉదయం 9:00 గంటలకు మూసివేయబడుతుంది (Cutoff: 9:00 AM IST).
                </p>
                <p className="text-[#29231F]/70">• {temple.contactInfo}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
