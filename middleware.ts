import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const BLOCKED_COUNTRIES = ["US"];
const BLOCKED_PATH = "/not-available";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const country = request.headers.get("x-vercel-ip-country") ?? "";
  if (BLOCKED_COUNTRIES.includes(country) && pathname !== BLOCKED_PATH) {
    return NextResponse.redirect(new URL(BLOCKED_PATH, request.url));
  }

  const { supabase, supabaseResponse } = createClient(request);
  await supabase.auth.getUser();
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
