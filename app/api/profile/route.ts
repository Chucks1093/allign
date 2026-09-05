import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ProfileService } from "@/services/profile.service";

export async function POST(req: NextRequest) {
  const { privy_user_id, wallet_address } = await req.json();

  if (!privy_user_id || !wallet_address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const profileService = new ProfileService(supabase);

  const profile = await profileService.create({ privy_user_id, wallet_address });

  return NextResponse.json({ profile });
}

export async function GET(req: NextRequest) {
  const privyUserId = req.nextUrl.searchParams.get("privy_user_id");

  if (!privyUserId) {
    return NextResponse.json({ error: "Missing privy_user_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const profileService = new ProfileService(supabase);

  const profile = await profileService.get(privyUserId);

  return NextResponse.json({ profile });
}
