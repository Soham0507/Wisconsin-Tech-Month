import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { verifyTurnstileToken } from "./turnstile.server";

const SubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  source: z.string().trim().max(80).optional().nullable(),
  captchaToken: z.string().min(1).max(4096),
});

export type NewsletterSubscribeInput = z.input<typeof SubscribeSchema>;

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: NewsletterSubscribeInput) => SubscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const captcha = await verifyTurnstileToken(data.captchaToken);
    if (!captcha.ok) throw new Error(captcha.error);

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: data.email, source: data.source ?? "about" });

    if (error && !/duplicate key/i.test(error.message)) {
      console.error("[newsletter] subscribe failed", error);
      throw new Error("Could not subscribe. Please try again.");
    }
    return { ok: true as const };
  });

