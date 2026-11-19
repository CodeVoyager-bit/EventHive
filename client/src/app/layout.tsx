import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceWorker from "@/components/ServiceWorker";

// Hive Print type: Bricolage Grotesque (condensed, heavy) for headlines, Instrument Sans for reading
// and UI, Geist Mono for ticket codes and figures.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--font-instrument", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "EventHive: gigs, meetups and more across India", template: "%s · EventHive" },
  description:
    "Find gigs, meetups, runs, workshops and supper clubs across India. Book in seconds and get in with a live ticket that can't be screenshotted.",
  appleWebApp: { capable: true, title: "EventHive", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Light (day print) by default; dark (night print) when the visitor picks it
async function getTheme() {
  return (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
}

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return { themeColor: theme === "light" ? "#f6f6f3" : "#111113", colorScheme: theme };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme comes from a cookie so the first paint already has the right colours
  const theme = await getTheme();

  return (
    <html lang="en-IN" data-theme={theme} data-scroll-behavior="smooth" className={`${bricolage.variable} ${instrument.variable} ${geistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <Navbar theme={theme} />
        <main id="main" className="main">
          {children}
        </main>
        <Footer />
        <ServiceWorker />
      </body>
    </html>
  );
}
