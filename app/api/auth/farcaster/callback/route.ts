import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const channelToken = req.nextUrl.searchParams.get("channelToken");
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!channelToken || !giftId) return NextResponse.json({ state: "failed" });

  const res = await fetch(
    `https://relay.farcaster.xyz/v1/channel/status?channelToken=${channelToken}`,
    { headers: { "Content-Type": "application/json" } },
  );

  if (!res.ok) return NextResponse.json({ state: "pending" });

  const data = await res.json();
  // data.state is "pending" or "completed"
  // data.username is the Farcaster username (top level, not nested)

  if (data.state !== "completed") return NextResponse.json({ state: data.state ?? "pending" });

  const username = data.username as string | undefined;
  if (!username) return NextResponse.json({ state: "failed" });

  const cookieRes = NextResponse.json({ state: "completed", handle: username.toLowerCase() });
  cookieRes.cookies.set(
    `gift_claim_${giftId}`,
    JSON.stringify({ platform: "farcaster", handle: username.toLowerCase() }),
    { httpOnly: true, maxAge: 3600, path: "/" },
  );
  return cookieRes;
}
