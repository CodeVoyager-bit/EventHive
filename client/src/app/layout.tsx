import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EventHive — Discover & Book Events", template: "%s · EventHive" },
  description:
    "EventHive is your gateway to discovering, organizing, and attending unforgettable events. Browse concerts, tech meetups, sports, and more.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme comes from a cookie so the first paint already has the right colours
  const theme = (await cookies()).get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="en" data-theme={theme} className={jakarta.variable}>
      <body>
        <div className="bg-shapes" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <Navbar theme={theme} />
        <main id="main" className="main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
