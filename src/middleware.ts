import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isStaff, verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const forCabinet = pathname.startsWith("/cabinet") || pathname.startsWith("/api/cabinet");
  const allowed = session && (forCabinet ? session.role === "teacher" : isStaff(session.role));
  if (allowed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: session ? "Недостатньо прав" : "Потрібна авторизація" }, { status: session ? 403 : 401 });
  }
  if (session) return NextResponse.redirect(new URL(session.role === "teacher" ? "/cabinet" : "/admin", req.url));
  const url = new URL("/admin/login", req.url);
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/cabinet/:path*", "/api/cabinet/:path*"] };
