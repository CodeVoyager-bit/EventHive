import { NextRequest, NextResponse } from "next/server";
import { decodeSession, TOKEN_COOKIE } from "@/lib/session";

// Route protection (Next 16 "proxy", formerly middleware). Express still authorizes every data call.
export function proxy(req: NextRequest) {
  const user = decodeSession(req.cookies.get(TOKEN_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;

  if (!user) {
    const login = new URL("/auth/login", req.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (pathname.startsWith("/dashboard") && user.role === "attendee") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/bookings/:path*", "/saved", "/notifications", "/settings", "/admin/:path*", "/door/:path*", "/passport"] };
