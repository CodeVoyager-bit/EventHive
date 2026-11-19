import { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:5001/api";

// The private calendar feed (/calendar/<token>.ics), fetched by Google/Apple Calendar on their own
// schedule. The token is the credential; this route passes the site's origin so links point back here.
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const upstream = await fetch(`${API_URL}/calendar/${encodeURIComponent(token)}?web=${encodeURIComponent(req.nextUrl.origin)}`, { cache: "no-store" });
  if (!upstream.ok) return new Response("Calendar not found", { status: upstream.status === 404 ? 404 : 502 });
  return new Response(await upstream.text(), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" },
  });
}
