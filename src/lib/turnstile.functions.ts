import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyTurnstileToken } from "./turnstile.server";

const Schema = z.object({
  token: z.string().min(1).max(4096),
});

/**
 * Server-side Cloudflare Turnstile verification.
 * Throws if the captcha token is missing or rejected by Cloudflare.
 * Called from auth (sign in / sign up) before delegating to Supabase.
 */
export const verifyCaptcha = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof Schema>) => Schema.parse(d))
  .handler(async ({ data }) => {
    const result = await verifyTurnstileToken(data.token);
    if (!result.ok) throw new Error(result.error);
    return { ok: true as const };
  });
