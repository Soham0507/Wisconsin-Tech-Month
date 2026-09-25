import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { verifyTurnstileToken } from "./turnstile.server";

const InquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(255),
  interests: z.array(z.string().max(60)).max(10).default([]),
  tierInterest: z.string().max(60).optional().nullable(),
  budgetRange: z.string().max(60).optional().nullable(),
  cityFocus: z.string().max(120).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  captchaToken: z.string().min(1).max(4096),
});


export type SponsorInquiryInput = z.input<typeof InquirySchema>;

export const submitSponsorInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: SponsorInquiryInput) => InquirySchema.parse(data))
  .handler(async ({ data }) => {
    const captcha = await verifyTurnstileToken(data.captchaToken);
    if (!captcha.ok) throw new Error(captcha.error);

    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );


    const { data: inserted, error } = await supabase
      .from("sponsor_inquiries")
      .insert({
        name: data.name,
        company: data.company,
        email: data.email,
        interests: data.interests,
        tier_interest: data.tierInterest ?? null,
        budget_range: data.budgetRange ?? null,
        city_focus: data.cityFocus ?? null,
        message: data.message ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[sponsor_inquiries] insert failed", error);
      throw new Error("Could not save your inquiry. Please try again.");
    }

    try {
      const { sendSponsorInquiry } = await import("./email.server");
      await sendSponsorInquiry(inserted?.id ?? crypto.randomUUID(), data);
    } catch (e) {
      console.error("[sponsor_inquiries] notification email failed", e);
    }

    return { ok: true as const };
  });
