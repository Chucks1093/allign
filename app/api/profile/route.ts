import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ProfileService } from "@/services/profile.service";

export async function POST(req: NextRequest) {
  const { wallet_address } = await req.json();

  if (!wallet_address) {
    return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const profileService = new ProfileService(supabase);
    const profile = await profileService.create({ privy_user_id: wallet_address, wallet_address });
    return NextResponse.json({ profile });
  } catch (e: any) {
    // Non-fatal — profile sync failure shouldn't break the app
    console.warn("Profile sync failed:", e?.message);
    return NextResponse.json({ ok: true });
  }
}

export async function GET(req: NextRequest) {
  const walletAddress = req.nextUrl.searchParams.get("wallet_address");

  if (!walletAddress) {
    return NextResponse.json({ error: "Missing wallet_address" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const profileService = new ProfileService(supabase);

  const profile = await profileService.get(walletAddress);

  return NextResponse.json({ profile });
}
