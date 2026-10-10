import { apiFetch } from "@/lib/server";
import { toIcs } from "@/lib/calendar";
import type { Event } from "@/types";

// GET /events/:id/calendar.ics: downloadable calendar entry (Apple Calendar, Outlook, etc.)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const event = await apiFetch<Event>(`/events/${id}`).catch(() => null);
  if (!event) return new Response("Event not found", { status: 404 });

  const pageUrl = new URL(`/events/${id}`, req.url).toString();
  const filename = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
  return new Response(toIcs(event, pageUrl), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}.ics"`,
    },
  });
}
