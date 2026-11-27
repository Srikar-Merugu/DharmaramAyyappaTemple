import type { Metadata } from "next";
import {
  DM_Serif_Display,
  Manrope,
  Noto_Sans_Telugu,
} from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansTelugu = Noto_Sans_Telugu({
  variable: "--font-telugu-sans",
  subsets: ["telugu"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sri Ayyappa Swamy Annadanam | శ్రీ అయ్యప్ప స్వామి అన్నదానం",
  description: "Daily Annadanam registration & batch management.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="te"
      className={`${dmSerif.variable} ${manrope.variable} ${notoSansTelugu.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full bg-[#FAF7F2] text-[#1F1B18] font-sans selection:bg-[#5B1717] selection:text-[#FAF7F2]">
        {children}
      </body>
    </html>
  );
}
