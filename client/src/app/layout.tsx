import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PointerFX from "@/components/PointerFX";

// Archivo's width axis gives poster-style condensed display type; Geist carries body and UI.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false }); // ticket codes only

export const metadata: Metadata = {
  title: { default: "EventHive: Discover & Book Events", template: "%s · EventHive" },
  description:
    "EventHive is your gateway to discovering, organizing, and attending unforgettable events. Browse concerts, tech meetups, sports, and more.",
};

// Light (colourful) by default; dark only when the visitor picks it
async function getTheme() {
  return (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return { themeColor: theme === "light" ? "#f7f6fb" : "#0b0b0f", colorScheme: theme };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme comes from a cookie so the first paint already has the right colours
  const theme = await getTheme();

  return (
    <html lang="en" data-theme={theme} data-scroll-behavior="smooth" className={`${archivo.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to Content</a>
        <Navbar theme={theme} />
        <main id="main" className="main">
          {children}
        </main>
        <Footer />
        <PointerFX />
      </body>
    </html>
  );
}
