import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const giftId = req.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("twitter_cv")?.value;
  const origin = cookieStore.get("twitter_origin")?.value ?? new URL(req.url).origin;

  const fail = (reason: string) => {
    console.error("[twitter/callback] FAIL:", reason);
    return NextResponse.redirect(`${origin}/claim?id=${giftId}&auth_error=1`);
  };

  if (!code || !giftId || !codeVerifier) {
    console.error("[twitter/callback] missing:", { code: !!code, giftId: !!giftId, codeVerifier: !!codeVerifier });
    return fail("missing params");
  }

  const clientId = process.env.TWITTER_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_OAUTH_CLIENT_SECRET!;
  const redirectUri = `${origin}/api/auth/twitter/callback`;

  console.log("[twitter/callback] origin:", origin, "redirectUri:", redirectUri);

  // Confidential client uses Basic Auth with client_id:client_secret
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const tokenData = await tokenRes.json();
  console.log("[twitter/callback] token response status:", tokenRes.status, "body:", JSON.stringify(tokenData));
  if (!tokenData.access_token) return fail(`no access_token: ${JSON.stringify(tokenData)}`);

  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=username", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json();
  console.log("[twitter/callback] user data:", JSON.stringify(userData));
  const username = userData.data?.username as string | undefined;
  if (!username) return fail(`no username: ${JSON.stringify(userData)}`);

  const res = NextResponse.redirect(`${origin}/claim?id=${giftId}`);
  res.cookies.set(
    `gift_claim_${giftId}`,
    JSON.stringify({ platform: "twitter", handle: username.toLowerCase() }),
    { httpOnly: true, maxAge: 3600, path: "/" },
  );
  res.cookies.delete("twitter_cv");
  res.cookies.delete("twitter_origin");
  return res;
}
