import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import LoginForm from "./LoginForm";
import { getSessionUser } from "@/lib/server";
import { safeNext } from "../safeNext";
import s from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);

  return (
    <div className={s.page}>
      <aside className={s.brand}>
        <div className={s.brandInner}>
          <h2>Welcome back to EventHive</h2>
          <p>Sign in to see your tickets, manage your events, and discover what is on next.</p>
          <ul className={s.points}>
            <li><CheckCircle2 size={18} aria-hidden="true" /> Tickets with QR codes, ready at the door</li>
            <li><CheckCircle2 size={18} aria-hidden="true" /> Organizer dashboard with live sales</li>
            <li><CheckCircle2 size={18} aria-hidden="true" /> Reviews from real attendees</li>
          </ul>
        </div>
      </aside>
      <section className={s.formSide}>
        <LoginForm next={next} />
      </section>
    </div>
  );
}
