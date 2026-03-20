import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "EventHive — Discover & Book Amazing Events",
  description:
    "EventHive is your gateway to discovering, organizing, and attending unforgettable events. Browse concerts, tech meetups, sports, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <div className="global-bg-shapes">
          <div className="g-shape g-shape-1"></div>
          <div className="g-shape g-shape-2"></div>
          <div className="g-shape g-shape-3"></div>
        </div>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 64px)" }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
