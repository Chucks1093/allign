import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const giftId = req.nextUrl.searchParams.get("giftId");
  if (!giftId) return NextResponse.json({ error: "Missing giftId" }, { status: 400 });

  const clientId = process.env.TWITTER_OAUTH_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: "Twitter not configured" }, { status: 500 });

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/twitter/callback`;

  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "users.read",
    state: giftId,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
  const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set("twitter_cv", codeVerifier, cookieOpts);
  res.cookies.set("twitter_origin", origin, cookieOpts);
  return res;
}
