"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

// Opening a notification marks it read (fire and forget; navigation doesn't wait)
export default function NotificationLink({ id, href, unread, className, children }: { id: string; href: string; unread: boolean; className: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => unread && api.markRead(id).catch(() => {})}>
      {children}
    </Link>
  );
}
