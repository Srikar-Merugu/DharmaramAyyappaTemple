"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/types";

export const adminTranslations = {
  te: {
    brandSub: "శ్రీ అయ్యప్ప స్వామి అన్నదానం",
    publicPortal: "పబ్లిక్ పోర్టల్",
    logout: "లాగ్అవుట్",
    nav: {
      overview: "సమీక్ష",
      registrations: "నమోదులు",
      attendance: "హాజరు",
      profiles: "స్వామి ప్రొఫైల్స్",
      reports: "నివేదికలు",
      posters: "పోస్టర్లు",
      settings: "సెట్టింగ్స్ & QR",
    },
    overview: {
      title: "రోజువారీ అన్నదానం సమీక్ష",
      cutoff: "కటాఫ్",
      today: "ఈ రోజు",
      tomorrow: "రేపు",
      dayAfter: "ఎల్లుండి",
      expectedRegistered: "నమోదైన భక్తులు",
      individual: "వ్యక్తిగత",
      group: "సమూహ",
      actualAttendance: "మొత్తం హాజరు",
      registeredLabel: "నమోదైనవారు",
      walkIns: "వాక్-ఇన్లు",
      walkInSub: "నేరుగా వచ్చినవారు",
      noShowsCancelled: "రానివారు / రద్దు",
      pendingCheckin: "పెండింగ్",
      left: "ఖాళీ",
      full: "నిండింది",
      registeredColon: "నమోదైనవారు:",
      present: "హాజరు",
      pending: "పెండింగ్",
      noShow: "రాలేదు",
      markBtn: "హాజరు & వాక్-ఇన్లు నమోదు చేయండి",
    },
    registrations: {
      title: "నమోదులు",
      subtitle: "భక్తుల నమోదులను వెతకండి, మార్చండి లేదా రద్దు చేయండి",
      manualBtn: "+ మాన్యువల్ నమోదు",
      searchPlaceholder: "పేరు, ఫోన్, గ్రామం, కోడ్ వెతకండి...",
      allBatches: "అన్ని బ్యాచ్‌లు",
      allTypes: "అన్ని రకాలు",
      allStatus: "అన్ని స్థితులు",
      individual: "వ్యక్తిగత",
      group: "సమూహ",
      active: "యాక్టివ్",
      cancelled: "రద్దు",
      loading: "నమోదులు లోడ్ అవుతున్నాయి...",
      empty: "నమోదులు ఏవీ కనుగొనబడలేదు.",
      members: "సభ్యులు",
      edit: "మార్చు",
      cancel: "రద్దు",
      dateLabel: "తేదీ:",
      batchLabel: "బ్యాచ్:",
    },
    attendance: {
      title: "బ్యాచ్ హాజరు & వాక్-ఇన్లు",
      subtitle: "భక్తుల హాజరు నమోదు చేయండి మరియు వాక్-ఇన్లను చేర్చండి",
      registered: "నమోదైనవారు",
      presentReg: "హాజరు (నమోదు)",
      walkIns: "వాక్-ఇన్లు",
      pending: "పెండింగ్",
      noShows: "రానివారు",
      quickWalkin: "తక్షణ వాక్-ఇన్ నమోదు (హాజరుగా నమోదు అవుతుంది)",
      namePh: "స్వామి / భక్తుని పేరు *",
      phonePh: "మొబైల్ (ఐచ్ఛికం)",
      villagePh: "గ్రామం (ఐచ్ఛికం)",
      recordWalkin: "+ వాక్-ఇన్ నమోదు",
      adding: "చేరుస్తోంది...",
      registeredDevotees: "నమోదైన భక్తులు",
      loading: "జాబితా లోడ్ అవుతోంది...",
      empty: "ఈ తేదీ మరియు బ్యాచ్‌కు నమోదులు లేవు.",
      markAllPresent: "అందరూ హాజరు",
      markAllAbsent: "అందరూ రాలేదు",
      present: "హాజరు",
      absent: "రాలేదు",
      walkInAttendees: "వాక్-ఇన్ భక్తులు",
    },
    profiles: {
      title: "స్వామి ప్రొఫైల్స్ & సందర్శన చరిత్ర",
      subtitle: "పేరు, ఫోన్ లేదా గ్రామంతో భక్తులను వెతకండి.",
      searchPh: "పేరు, ఫోన్, గ్రామం, SWM కోడ్ వెతకండి...",
      loading: "ప్రొఫైల్స్ లోడ్ అవుతున్నాయి...",
      empty: "ప్రొఫైల్స్ ఏవీ లేవు.",
      visits: "సందర్శనలు",
      last: "చివరిసారి:",
      noVisits: "ఇంకా హాజరు కాలేదు",
      selectPrompt: "వివరాలు చూడటానికి ఒక స్వామి ప్రొఫైల్‌ను ఎంచుకోండి.",
      totalAttended: "మొత్తం హాజరు",
      lastVisit: "చివరి సందర్శన",
      historyTitle: "నమోదు & హాజరు చరిత్ర",
    },
    reports: {
      title: "నివేదికలు & ఆహార ప్రణాళిక",
      subtitle: "రోజువారీ బ్యాచ్ లెక్కలు, సీజన్ నివేదికలు మరియు CSV డౌన్‌లోడ్",
      dailyCsv: "రోజువారీ CSV",
      seasonCsv: "సీజన్ CSV",
      print: "ప్రింట్",
      dailyReport: "రోజువారీ సేవా నివేదిక",
      attendanceRate: "హాజరు శాతం:",
      seasonOverview: "సీజన్ సమీక్ష",
      topVillages: "ప్రధాన గ్రామాలు",
      noVillageData: "గ్రామ సమాచారం ఇంకా లేదు.",
    },
    settings: {
      title: "సీజన్ సెట్టింగ్స్ & శాశ్వత క్యూఆర్ కోడ్",
      saveBtn: "సెట్టింగ్స్ సేవ్ చేయండి",
      saving: "సేవ్ అవుతోంది...",
      savedMsg: "సెట్టింగ్స్ విజయవంతంగా సేవ్ చేయబడ్డాయి.",
      pinLabel: "నిర్వాహక లాగిన్ పిన్ (4 అంకెలు)",
      qrTitle: "శాశ్వత దేవాలయ క్యూఆర్ కోడ్",
      qrSub: "దేవాలయ ప్రవేశద్వారం వద్ద ప్రింట్ చేసి ఉంచండి.",
      postersBtn: "పూర్తి A4 దేవాలయ పోస్టర్లు & గైడ్ చూడండి →",
      auditTitle: "ఇటీవలి మార్పుల లాగ్",
    },
  },
  en: {
    brandSub: "Sri Ayyappa Swamy Annadanam",
    publicPortal: "Public Portal",
    logout: "Logout",
    nav: {
      overview: "Overview",
      registrations: "Registrations",
      attendance: "Attendance",
      profiles: "Swami Profiles",
      reports: "Reports",
      posters: "Print Posters",
      settings: "Settings & QR",
    },
    overview: {
      title: "Daily Annadanam Overview",
      cutoff: "Cutoff",
      today: "Today",
      tomorrow: "Tomorrow",
      dayAfter: "Day After",
      expectedRegistered: "Expected Registered",
      individual: "individual",
      group: "group",
      actualAttendance: "Actual Attendance",
      registeredLabel: "registered",
      walkIns: "Walk-ins",
      walkInSub: "Recorded directly at service",
      noShowsCancelled: "No-shows / Cancelled",
      pendingCheckin: "pending check-in",
      left: "left",
      full: "FULL",
      registeredColon: "Registered:",
      present: "Present",
      pending: "Pending",
      noShow: "No-show",
      markBtn: "Mark Attendance & Walk-ins",
    },
    registrations: {
      title: "Registrations",
      subtitle: "Search, view, edit, cancel, or add manual registrations",
      manualBtn: "+ Manual Registration",
      searchPlaceholder: "Search name, phone, village, code...",
      allBatches: "All Batches",
      allTypes: "All Types",
      allStatus: "All Status",
      individual: "Individual",
      group: "Group",
      active: "Active",
      cancelled: "Cancelled",
      loading: "Loading registrations...",
      empty: "No registrations found matching your filters.",
      members: "Members",
      edit: "Edit",
      cancel: "Cancel",
      dateLabel: "Date:",
      batchLabel: "Batch:",
    },
    attendance: {
      title: "Batch Attendance & Walk-ins",
      subtitle: "Mark individual or group attendance and record walk-in devotees",
      registered: "Registered",
      presentReg: "Present (Reg)",
      walkIns: "Walk-ins",
      pending: "Pending",
      noShows: "No-shows",
      quickWalkin: "Quick Walk-in Entry (Recorded as Present)",
      namePh: "Swami / Devotee Name *",
      phonePh: "Mobile (optional)",
      villagePh: "Village (optional)",
      recordWalkin: "+ Record Walk-in",
      adding: "Adding...",
      registeredDevotees: "Registered Devotees",
      loading: "Loading batch list...",
      empty: "No active registrations for this date and batch.",
      markAllPresent: "Mark All Present",
      markAllAbsent: "Mark All Absent",
      present: "Present",
      absent: "Absent",
      walkInAttendees: "Walk-in Attendees",
    },
    profiles: {
      title: "Swami Profiles & Visit History",
      subtitle: "Search returning devotees by name, phone, village, or profile code.",
      searchPh: "Search name, phone, village, SWM code...",
      loading: "Loading profiles...",
      empty: "No profiles found.",
      visits: "visits",
      last: "Last:",
      noVisits: "No visits yet",
      selectPrompt: "Select a Swami profile to view visit history.",
      totalAttended: "Total Attended",
      lastVisit: "Last Visit",
      historyTitle: "Registration & Attendance History",
    },
    reports: {
      title: "Reports & Food Planning",
      subtitle: "Daily batch reconciliation, seasonal utilization, and CSV exports",
      dailyCsv: "Daily CSV",
      seasonCsv: "Season CSV",
      print: "Print",
      dailyReport: "Daily Service Report",
      attendanceRate: "Attendance Rate:",
      seasonOverview: "Season Overview",
      topVillages: "Top Villages (Where Supplied)",
      noVillageData: "No village data recorded yet.",
    },
    settings: {
      title: "Season Settings & Permanent QR Code",
      saveBtn: "Save Settings",
      saving: "Saving...",
      savedMsg: "Settings saved successfully.",
      pinLabel: "Organizer Login PIN (4 digits)",
      qrTitle: "Permanent Temple QR Code",
      qrSub: "Print and display at the temple entrance.",
      postersBtn: "Open Full A4 Temple Posters & Swami Guide →",
      auditTitle: "Recent Audit Log",
    },
  },
} as const;

interface AdminLangContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  at: (typeof adminTranslations)["te"] | (typeof adminTranslations)["en"];
}

const AdminLangContext = createContext<AdminLangContextValue | null>(null);

export function AdminLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("te");

  useEffect(() => {
    const saved = window.localStorage.getItem("ayyappa_admin_lang");
    if (saved === "en" || saved === "te") {
      setLangState(saved);
    }
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    window.localStorage.setItem("ayyappa_admin_lang", next);
  };

  return (
    <AdminLangContext.Provider
      value={{ lang, setLang, at: adminTranslations[lang] }}
    >
      {children}
    </AdminLangContext.Provider>
  );
}

export function useAdminLang() {
  const ctx = useContext(AdminLangContext);
  if (!ctx) {
    return {
      lang: "te" as Language,
      setLang: () => {},
      at: adminTranslations.te,
    };
  }
  return ctx;
}
