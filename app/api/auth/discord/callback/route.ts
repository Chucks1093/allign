import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const giftId = req.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const origin = cookieStore.get("discord_origin")?.value ?? new URL(req.url).origin;

  const fail = () => NextResponse.redirect(`${origin}/claim?id=${giftId}&auth_error=1`);

  if (!code || !giftId) return fail();

  const redirectUri = `${origin}/api/auth/discord/callback`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return fail();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();
  const username = user.username as string | undefined;
  if (!username) return fail();

  const res = NextResponse.redirect(`${origin}/claim?id=${giftId}`);
  res.cookies.set(
    `gift_claim_${giftId}`,
    JSON.stringify({ platform: "discord", handle: username.toLowerCase() }),
    { httpOnly: true, maxAge: 3600, path: "/" },
  );
  res.cookies.delete("discord_origin");
  return res;
}
