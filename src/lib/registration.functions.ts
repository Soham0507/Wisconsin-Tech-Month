import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { verifyTurnstileToken } from "./turnstile.server";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const RegisterSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  captchaToken: z.string().min(1).max(4096),
});

export const registerForEvent = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof RegisterSchema>) => RegisterSchema.parse(d))
  .handler(async ({ data }) => {
    // Fail-closed: reject before touching the DB if the captcha isn't valid.
    const captcha = await verifyTurnstileToken(data.captchaToken);
    if (!captcha.ok) throw new Error(captcha.error);


    const supa = publicClient();
    // Load event details from the safe public view (no host PII).
    const { data: ev, error: evErr } = await supa
      .from("events_public")
      .select("id, title, description, venue, address, starts_at, ends_at, capacity, path, status, image_url")
      .eq("id", data.eventId)
      .eq("path", "internal")
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("This event is not open for registration.");
    if (!ev.id) throw new Error("This event is not open for registration.");
    const eventId = ev.id;


    // Capacity check
    if (ev.capacity) {
      const { count } = await supa
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);
      if ((count ?? 0) >= ev.capacity) throw new Error("This event is full.");
    }

    const { error } = await supa.from("event_registrations").insert({
      event_id: eventId,
      name: data.name,
      email: data.email,
    });

    if (error) {
      if (error.code === "23505") throw new Error("You are already registered for this event.");
      throw new Error(error.message);
    }

    const { sendRegistrationConfirmation } = await import("./email.server");
    await sendRegistrationConfirmation(data.email, data.name, ev as unknown as Parameters<typeof sendRegistrationConfirmation>[2]);

    return { ok: true as const };
  });

const ClickSchema = z.object({
  eventId: z.string().uuid(),
  referrer: z.string().max(500).optional(),
});

export const logEventClick = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ClickSchema>) => ClickSchema.parse(d))
  .handler(async ({ data }) => {
    const supa = publicClient();
    await supa.from("event_clicks").insert({
      event_id: data.eventId,
      referrer: data.referrer ?? null,
    });
    return { ok: true as const };
  });
