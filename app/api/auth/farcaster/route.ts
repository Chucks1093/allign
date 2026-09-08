import { NextRequest, NextResponse } from "next/server";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

const appClient = createAppClient({
  relay: "https://relay.farcaster.xyz",
  ethereum: viemConnector(),
});

export async function GET(req: NextRequest) {
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!giftId) return NextResponse.json({ error: "Missing giftId" }, { status: 400 });

  const origin = new URL(req.url).origin;

  const { data, error } = await appClient.createChannel({
    siweUri: `${origin}/claim?id=${giftId}`,
    domain: new URL(origin).hostname,
  });

  if (error) {
    console.error("Farcaster createChannel error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channelToken: data.channelToken, url: data.url });
}
