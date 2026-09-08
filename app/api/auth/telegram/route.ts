import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Telegram Login Widget sends user data via GET params with an HMAC hash
export async function GET(req: NextRequest) {
  const giftId = req.nextUrl.searchParams.get("giftId");
  const hash = req.nextUrl.searchParams.get("hash");
  const username = req.nextUrl.searchParams.get("username");
  const authDate = req.nextUrl.searchParams.get("auth_date");

  const origin = new URL(req.url).origin;
  const fail = () => NextResponse.redirect(`${origin}/claim?id=${giftId}&auth_error=1`);

  if (!giftId || !hash || !username || !authDate) return fail();

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return fail();

  // Verify HMAC — only Telegram's own params, not our custom giftId
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  delete params.hash;
  delete params.giftId; // our param — Telegram didn't sign this
  const checkString = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (expectedHash !== hash) return fail();

  // Check auth_date is within 1 day to prevent replay attacks
  if (Date.now() / 1000 - parseInt(authDate) > 86400) return fail();

  const res = NextResponse.redirect(`${origin}/claim?id=${giftId}`);
  res.cookies.set(
    `gift_claim_${giftId}`,
    JSON.stringify({ platform: "telegram", handle: username.toLowerCase() }),
    { httpOnly: true, maxAge: 3600, path: "/" },
  );
  return res;
}
