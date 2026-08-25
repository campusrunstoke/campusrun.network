import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Body / UI / data face. Self-hosted at build time (no runtime CDN request).
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Mono face — event codes and the live-feed strip on the console card.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display / hero face. Satoshi isn't on Google Fonts (it's Fontshare), so it's
// self-hosted from public/fonts as woff2 — 500 for the light big headlines,
// 700 for the wordmark, 900 for the data values.
const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../public/fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/Satoshi-900.woff2", weight: "900", style: "normal" },
  ],
});

// Default: noindex protects admin + the NFC capture/redirect surfaces. Public
// marketing pages (the homepage, the pilot form) flip this on per-page.
export const metadata: Metadata = {
  title: "Campus Run",
  description: "How stoked are you?",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${satoshi.variable}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
