import { NextRequest, NextResponse } from "next/server";

// Polls Warpcast relay for SIWF completion and returns the verified username
export async function GET(req: NextRequest) {
  const channelToken = req.nextUrl.searchParams.get("channelToken");
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!channelToken || !giftId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const res = await fetch(`https://relay.farcaster.xyz/v1/channel/status?channelToken=${channelToken}`);
  if (!res.ok) return NextResponse.json({ state: "pending" });

  const data = await res.json();
  if (data.state !== "completed") return NextResponse.json({ state: data.state ?? "pending" });

  // username from the SIWF message
  const username = data.message?.username as string | undefined;
  if (!username) return NextResponse.json({ state: "failed" });

  const cookieRes = NextResponse.json({ state: "completed", handle: username.toLowerCase() });
  cookieRes.cookies.set(
    `gift_claim_${giftId}`,
    JSON.stringify({ platform: "farcaster", handle: username.toLowerCase() }),
    { httpOnly: true, maxAge: 3600, path: "/" },
  );
  return cookieRes;
}
