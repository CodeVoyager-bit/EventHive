import { ImageResponse } from "next/og";
import { apiFetch } from "@/lib/server";
import { categoryMeta } from "@/lib/categories";
import { TONE_HEX } from "@/lib/tones";
import { formatDate, formatPrice, formatTime, fromPrice } from "@/lib/format";
import type { Event } from "@/types";

// The card WhatsApp, X and LinkedIn show when an event link is shared
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Event on EventHive";

// The brand's display face for the card, fetched once (subset to the characters used) and cached by
// Next's fetch cache; if Google Fonts can't be reached the card falls back to the default font.
async function brandFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,800&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await apiFetch<Event>(`/events/${id}`).catch(() => null);
  if (!event) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#ffd23f", fontSize: 96, fontWeight: 800, color: "#16161d" }}>EventHive</div>,
      size
    );
  }
  const meta = categoryMeta(event.category);
  const tone = TONE_HEX[meta.tone];
  const price = fromPrice(event);
  const photo = event.imageUrl ? event.imageUrl.replace(/w=\d+/, "w=900").replace(/q=\d+/, "q=70") : "";
  const where = event.eventType === "online" ? "Online" : event.location;

  const title = event.title;
  const font = await brandFont(`EventHive${title}${meta.label}${where}${`${meta.label}${where}`.toUpperCase()}FromFree₹0123456789,. ·${formatDate(event.date, { weekday: "long", day: "numeric", month: "long" })}${formatTime(event.date)}Host approves guests`);
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#f6f6f3", color: "#16161d", fontFamily: font ? "Bricolage" : "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 660, padding: "56px 56px 52px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800 }}>
          <svg width="44" height="44" viewBox="0 0 24 24">
            <path d="M12 2.2L3.4 7.2V16.8L12 21.8L20.6 16.8V7.2L12 2.2Z" fill="#ffd23f" stroke="#16161d" strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 8.8V15.2L15.4 12L10 8.8Z" fill="#16161d" />
          </svg>
          EventHive
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: tone.fill === "#ffd23f" ? "#8a6a00" : tone.fill }}>
            {meta.label} · {where}
          </div>
          <div style={{ display: "flex", fontSize: event.title.length > 28 ? 64 : 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{event.title}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#45454f" }}>
            {formatDate(event.date, { weekday: "long", day: "numeric", month: "long" })}, {formatTime(event.date)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", padding: "12px 24px", borderRadius: 14, background: "#ffd23f", fontSize: 30, fontWeight: 800 }}>
            {price === 0 ? "Free" : `From ${formatPrice(price)}`}
          </div>
          {event.requiresApproval && (
            <div style={{ display: "flex", padding: "12px 20px", borderRadius: 14, border: "2px solid #16161d", fontSize: 26, fontWeight: 700 }}>Host approves guests</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, background: tone.fill, position: "relative" }}>
        {photo && (
          <img src={photo} alt="" width={540} height={630} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: tone.fill, display: "flex" }} />
      </div>
    </div>,
    { ...size, fonts: font ? [{ name: "Bricolage", data: font, weight: 800, style: "normal" }] : undefined }
  );
}
