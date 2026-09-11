import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const BLOCKED_COUNTRIES = ["US"];

export async function middleware(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country") ?? "";
  if (BLOCKED_COUNTRIES.includes(country)) {
    return NextResponse.rewrite(new URL("/not-available", request.url));
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
