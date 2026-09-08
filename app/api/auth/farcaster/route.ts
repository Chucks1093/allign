import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!giftId) return NextResponse.json({ error: "Missing giftId" }, { status: 400 });

  const origin = new URL(req.url).origin;

  const res = await fetch("https://relay.farcaster.xyz/v1/channel/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siweUri: `${origin}/claim?id=${giftId}`,
      domain: new URL(origin).hostname,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Farcaster relay error:", res.status, data);
    return NextResponse.json({ error: "Farcaster relay failed", detail: data }, { status: 500 });
  }

  return NextResponse.json({ channelToken: data.channelToken, url: data.url });
}
