import { NextRequest, NextResponse } from "next/server";

// Creates a SIWF channel via Warpcast relay, returns channelToken + url for client to poll
export async function GET(req: NextRequest) {
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!giftId) return NextResponse.json({ error: "Missing giftId" }, { status: 400 });

  const origin = new URL(req.url).origin;
  const siweUri = `${origin}/claim?id=${giftId}`;

  const res = await fetch("https://relay.farcaster.xyz/v1/channel/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siweUri, domain: new URL(origin).hostname }),
  });

  if (!res.ok) return NextResponse.json({ error: "Farcaster relay failed" }, { status: 500 });
  const data = await res.json();

  return NextResponse.json({ channelToken: data.channelToken, url: data.url });
}
