import type { Metadata } from "next";
import Link from "next/link";
import { AddressBook, Bank, Bell, CaretRight, Heart, IdentificationCard, ShieldCheck, SquaresFour, Ticket, UserCircle } from "@phosphor-icons/react/ssr";
import SettingsForm from "./SettingsForm";
import LogoutButton from "./LogoutButton";
import { apiFetch, getCities } from "@/lib/server";
import { initials } from "@/lib/format";
import type { User } from "@/types";
import s from "./settings.module.css";

export const metadata: Metadata = { title: "Account" };

// The account hub (the "Account" tab on phones): shortcuts for your role, profile, log out
export default async function AccountPage() {
  const [me, cities] = await Promise.all([apiFetch<User>("/me"), getCities()]);
  const host = me.role === "organizer" || me.role === "admin";
  const links = [
    ...(host
      ? [
          { href: "/dashboard", label: "Host dashboard", icon: SquaresFour },
          { href: `/hosts/${me._id}`, label: "Your public host page", icon: UserCircle },
          { href: "/dashboard/audience", label: "Your audience", icon: AddressBook },
          { href: "/dashboard/payouts", label: "Payouts", icon: Bank },
        ]
      : [
          { href: "/bookings", label: "My tickets", icon: Ticket },
          { href: "/saved", label: "Saved events", icon: Heart },
          { href: "/passport", label: "Your event passport", icon: IdentificationCard },
        ]),
    { href: "/notifications", label: "Notifications", icon: Bell },
    ...(me.role === "admin" ? [{ href: "/admin", label: "Admin console", icon: ShieldCheck }] : []),
  ];

  return (
    <div className={`container ${s.wrap}`}>
      <header className={s.head}>
        <span className={s.avatar} aria-hidden="true">{initials(me.name)}</span>
        <div>
          <h1 className="h1">{me.name}</h1>
          <p className="muted">{me.email}</p>
        </div>
      </header>

      <nav className={s.links} aria-label="Account">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={s.link}>
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
            <CaretRight size={16} weight="bold" aria-hidden="true" className={s.caret} />
          </Link>
        ))}
      </nav>

      <h2 className={`h3 ${s.sub}`}>Profile</h2>
      <SettingsForm me={me} cities={cities.map((c) => c.city).filter((c) => c !== "Online")} />

      <div className={s.out}>
        <LogoutButton />
      </div>
    </div>
  );
}
