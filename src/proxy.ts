import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(getDashboard(session.user.role), req.url));
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user.role;

  if (pathname.startsWith("/admin") && role !== "MASTER_ADMIN") {
    return NextResponse.redirect(new URL(getDashboard(role), req.url));
  }
  if (pathname.startsWith("/team") && role !== "TEAM_MEMBER" && role !== "MASTER_ADMIN") {
    return NextResponse.redirect(new URL(getDashboard(role), req.url));
  }
  if (pathname.startsWith("/member") && role !== "DISTRIBUTOR") {
    return NextResponse.redirect(new URL(getDashboard(role), req.url));
  }

  return NextResponse.next();
});

function getDashboard(role: string) {
  if (role === "MASTER_ADMIN") return "/admin";
  if (role === "TEAM_MEMBER") return "/team";
  return "/member";
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
