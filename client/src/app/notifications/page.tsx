import type { Metadata } from "next";
import { ArrowsLeftRight, Bell, CalendarX, ChatCircle, ChatCircleDots, ChatCircleText, CheckCircle, DoorOpen, Fire, Flag, Hourglass, Megaphone, PencilSimple, Prohibit, Sparkle, Star, Ticket, Timer, XCircle } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react/lib";
import MarkAllRead from "./MarkAllRead";
import NotificationLink from "./NotificationLink";
import { apiFetch } from "@/lib/server";
import { formatDate, formatTime } from "@/lib/format";
import type { Notification } from "@/types";
import s from "./notifications.module.css";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<string, { icon: Icon; tone: string }> = {
  booking_request: { icon: Ticket, tone: "violet" },
  booking_approved: { icon: CheckCircle, tone: "green" },
  booking_declined: { icon: XCircle, tone: "red" },
  waitlist_promoted: { icon: Hourglass, tone: "green" },
  ticket_received: { icon: ArrowsLeftRight, tone: "pink" },
  event_updated: { icon: PencilSimple, tone: "orange" },
  event_cancelled: { icon: CalendarX, tone: "red" },
  announcement: { icon: Megaphone, tone: "hive" },
  new_event: { icon: Sparkle, tone: "blue" },
  new_review: { icon: Star, tone: "hive" },
  review_reply: { icon: ChatCircle, tone: "teal" },
  reminder: { icon: Bell, tone: "hive" },
  almost_gone: { icon: Fire, tone: "red" },
  price_ending: { icon: Timer, tone: "orange" },
  question: { icon: ChatCircleDots, tone: "violet" },
  answer: { icon: ChatCircleText, tone: "teal" },
  door_team: { icon: DoorOpen, tone: "blue" },
  on_sale: { icon: Ticket, tone: "green" },
  event_removed: { icon: Prohibit, tone: "red" },
  report_resolved: { icon: Flag, tone: "teal" },
};

// The in-app notification centre (EventHive sends no email or SMS)
export default async function NotificationsPage() {
  const { items, unread } = await apiFetch<{ items: Notification[]; unread: number }>("/me/notifications?limit=50");

  return (
    <div className={`container ${s.wrap}`}>
      <header className={s.head}>
        <h1 className="h1">Notifications</h1>
        {unread > 0 && <MarkAllRead />}
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <span className="empty-art"><Bell size={32} weight="bold" aria-hidden="true" /></span>
          <h2 className="h3">All quiet</h2>
          <p>Booking updates, waitlist news, host announcements and reminders show up here.</p>
        </div>
      ) : (
        <ul className={s.list}>
          {items.map((n) => {
            const { icon: Icon, tone } = ICONS[n.kind] ?? { icon: Bell, tone: "hive" };
            return (
              <li key={n._id}>
                <NotificationLink id={n._id} href={n.link} unread={!n.readAt} className={`${s.item} ${n.readAt ? "" : s.unread}`}>
                  <span className={s.icon} aria-hidden="true" data-tone={tone}>
                    <Icon size={22} weight="bold" />
                  </span>
                  <span className={s.text}>
                    <strong>{n.title}</strong>
                    {n.body && <span>{n.body}</span>}
                  </span>
                  <span className={`mono ${s.time}`}>
                    {formatDate(n.createdAt, { day: "numeric", month: "short" })}
                    <br />
                    {formatTime(n.createdAt)}
                  </span>
                  {!n.readAt && <span className="sr-only">Unread</span>}
                </NotificationLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
