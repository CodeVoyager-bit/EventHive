import { CalendarPlus, DownloadSimple, GoogleLogo } from "@phosphor-icons/react/ssr";
import { googleCalendarUrl } from "@/lib/calendar";
import type { Event } from "@/types";
import s from "./CalendarMenu.module.css";

// Native popover (no JS): Google Calendar link, or an .ics file for Apple Calendar / Outlook
export default function CalendarMenu({ event, pageUrl }: { event: Event; pageUrl: string }) {
  const id = `cal-${event._id}`;
  return (
    <>
      <button type="button" className={`btn btn-secondary btn-sm ${s.trigger}`} popoverTarget={id}>
        <CalendarPlus size={16} aria-hidden="true" /> Add to Calendar
      </button>
      <div id={id} popover="auto" className={s.menu}>
        <a href={googleCalendarUrl(event, pageUrl)} target="_blank" rel="noreferrer" className={s.item}>
          <GoogleLogo size={18} aria-hidden="true" /> Google Calendar
        </a>
        <a href={`/events/${event._id}/calendar.ics`} download className={s.item}>
          <DownloadSimple size={18} aria-hidden="true" /> Apple or Outlook (.ics)
        </a>
      </div>
    </>
  );
}
