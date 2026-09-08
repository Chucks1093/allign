import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!giftId) return NextResponse.json({ error: "Missing giftId" }, { status: 400 });

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Discord not configured" }, { status: 500 });

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/discord/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state: giftId,
  });

  const res = NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  res.cookies.set("discord_origin", origin, { httpOnly: true, maxAge: 600, path: "/" });
  return res;
}
