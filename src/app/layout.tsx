import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Noto_Sans_Telugu,
  Noto_Serif_Telugu,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansTelugu = Noto_Sans_Telugu({
  variable: "--font-telugu-sans",
  subsets: ["telugu"],
  weight: ["400", "500", "600", "700"],
});

const notoSerifTelugu = Noto_Serif_Telugu({
  variable: "--font-telugu-serif",
  subsets: ["telugu"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sri Ayyappa Swamy Annadanam | శ్రీ అయ్యప్ప స్వామి అన్నదానం",
  description:
    "Sacred daily Annadanam registration, batch schedule, and temple service portal — Swamiye Saranam Ayyappa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="te"
      className={`${cormorant.variable} ${jakarta.variable} ${notoSansTelugu.variable} ${notoSerifTelugu.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full bg-[#F8F3E9] text-[#29231F] font-sans selection:bg-[#5B1717] selection:text-[#F8F3E9]">
        {children}
      </body>
    </html>
  );
}
