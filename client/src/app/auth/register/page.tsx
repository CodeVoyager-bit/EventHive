import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import RegisterForm from "./RegisterForm";
import { getSessionUser } from "@/lib/server";
import { safeNext } from "../safeNext";
import s from "../auth.module.css";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);

  return (
    <div className={s.page}>
      <aside className={`${s.brand} ${s.brandBlue}`}>
        <div className={s.brandInner}>
          <h2>Join the EventHive community</h2>
          <p>Create an account to book tickets in seconds, or become an organizer and host your own events.</p>
          <ul className={s.points}>
            <li><CheckCircle2 size={18} aria-hidden="true" /> Free to join, no card required</li>
            <li><CheckCircle2 size={18} aria-hidden="true" /> General and VIP tickets</li>
            <li><CheckCircle2 size={18} aria-hidden="true" /> Switch to organizing any time</li>
          </ul>
        </div>
      </aside>
      <section className={s.formSide}>
        <RegisterForm next={next} />
      </section>
    </div>
  );
}
