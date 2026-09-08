import { NextRequest, NextResponse } from "next/server";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

const appClient = createAppClient({
  relay: "https://relay.farcaster.xyz",
  ethereum: viemConnector(),
});

export async function GET(req: NextRequest) {
  const channelToken = req.nextUrl.searchParams.get("channelToken");
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!channelToken || !giftId) return NextResponse.json({ state: "failed" });

  const { data, error } = await appClient.status({ channelToken });

  if (error) return NextResponse.json({ state: "pending" });
  if (data.state !== "completed") return NextResponse.json({ state: data.state });

  const username = data.username;
  if (!username) return NextResponse.json({ state: "failed" });

  const cookieRes = NextResponse.json({ state: "completed", handle: username.toLowerCase() });
  cookieRes.cookies.set(
    `gift_claim_${giftId}`,
    JSON.stringify({ platform: "farcaster", handle: username.toLowerCase() }),
    { httpOnly: true, maxAge: 3600, path: "/" },
  );
  return cookieRes;
}
