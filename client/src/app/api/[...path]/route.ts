import { NextRequest, NextResponse } from "next/server";

// Same-origin proxy in front of the Express API.
// The JWT lives in an httpOnly cookie on this origin; the browser never sees it
// and never calls Express directly, so no cross-site cookies or CORS are needed.

const API_URL = process.env.API_URL ?? "http://localhost:5001/api";
const TOKEN_COOKIE = "token";
const MAX_AGE = 60 * 60 * 24 * 7; // keep in sync with the server's JWT_EXPIRES_IN

type ApiJson = { success?: boolean; data?: { token?: string } & Record<string, unknown>; error?: string };

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const route = (await ctx.params).path.join("/");

  if (route === "auth/logout") {
    const res = NextResponse.json({ success: true, data: null });
    res.cookies.delete(TOKEN_COOKIE);
    return res;
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const upstream = await fetch(`${API_URL}/${route}${req.nextUrl.search}`, {
    method: req.method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    cache: "no-store",
  });
  const json: ApiJson = await upstream.json().catch(() => ({ success: false, error: "Invalid response from API" }));

  const issuedToken = upstream.ok && route.startsWith("auth/") ? json.data?.token : undefined;
  if (issuedToken) delete json.data!.token; // the token stays in the cookie only

  const res = NextResponse.json(json, { status: upstream.status });
  if (issuedToken) {
    res.cookies.set(TOKEN_COOKIE, issuedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
  }
  return res;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
