// Cloudflare Turnstile server-side token verification.
// See https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

// Cloudflare test secrets. "always passes" pairs with test site key 1x00000000000000000000AA.
const TEST_SECRET_PASS = "1x0000000000000000000000000000000AA";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
  hostname?: string;
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token || typeof token !== "string") {
    return { ok: false, error: "Captcha token missing." };
  }
  // Cloudflare's test site key issues tokens beginning with "XXXX." — validate
  // those against the matching test secret so preview/localhost flows succeed.
  const isTestToken = token.startsWith("XXXX.");
  const secret = isTestToken
    ? TEST_SECRET_PASS
    : (process.env.TURNSTILE_SECRET_KEY || process.env.secretkey || TEST_SECRET_PASS);
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as SiteverifyResponse;
    if (data.success) return { ok: true };
    const codes = (data["error-codes"] ?? []).join(", ");
    return { ok: false, error: `Captcha verification failed${codes ? ` (${codes})` : ""}.` };
  } catch (err) {
    console.error("[turnstile] siteverify request failed:", err);
    return { ok: false, error: "Captcha verification unavailable. Please try again." };
  }
}
