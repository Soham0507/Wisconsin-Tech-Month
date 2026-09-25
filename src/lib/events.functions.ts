import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { verifyTurnstileToken } from "./turnstile.server";


function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// Safe (non-PII) columns exposed on public event listings. Host contact
// fields (host_email, host_contact_name, host_contact_phone, host_contact_role)
// are intentionally excluded and are also revoked at the DB column level.
const PUBLIC_EVENT_COLUMNS =
  "id, organizer_id, status, path, title, description, host_org, image_url, week, track, format, region, city, venue, address, starts_at, ends_at, capacity, cost_cents, external_url, topics, audience, published_at, created_at, updated_at, summary, host_url, host_org_type, host_logo_url, featured, featured_home";

// -------- Public: list approved events (calendar) --------
export const listApprovedEvents = createServerFn({ method: "GET" }).handler(async () => {
  const supa = serverPublicClient();
  const { data, error } = await supa
    .from("events_public")
    .select(PUBLIC_EVENT_COLUMNS)
    .order("starts_at", { ascending: true });
  if (error) {
    console.error("[listApprovedEvents]", error);
    return { events: [] as Database["public"]["Tables"]["events"]["Row"][] };
  }
  return { events: (data ?? []) as unknown as Database["public"]["Tables"]["events"]["Row"][] };
});

// -------- Public: get single approved event --------
export const getApprovedEvent = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supa = serverPublicClient();
    const { data: row, error } = await supa
      .from("events_public")
      .select(PUBLIC_EVENT_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { event: (row ?? null) as unknown as Database["public"]["Tables"]["events"]["Row"] | null };
  });


// -------- Admin: fetch any event (any status) for preview rendering --------
export const getEventForAdminPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: adminOk } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!adminOk) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return { event: row };
  });

// -------- Owner: fetch own event (any status) for preview rendering --------
export const getMyEventPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .eq("organizer_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return { event: row };
  });

// -------- Owner: analytics for a single own event --------
export const getMyEventAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supa = context.supabase;
    const { data: owned, error: ownErr } = await supa
      .from("events")
      .select("id")
      .eq("id", data.eventId)
      .eq("organizer_id", context.userId)
      .maybeSingle();
    if (ownErr) throw new Error(ownErr.message);
    if (!owned) throw new Error("Forbidden");

    const [{ count: regCount }, { count: clickCount }, { count: viewCount }] = await Promise.all([
      supa.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", data.eventId),
      supa.from("event_clicks").select("id", { count: "exact", head: true }).eq("event_id", data.eventId),
      supa.from("page_views").select("id", { count: "exact", head: true }).eq("path", `/event/${data.eventId}`),
    ]);
    return {
      registrations: regCount ?? 0,
      clicks: clickCount ?? 0,
      views: viewCount ?? 0,
    };
  });

// -------- Submission schema --------
// Datetimes are local wall-clock strings like "2026-10-15T14:00" (or with :ss).
// This matches the existing seed convention and avoids timezone drift when
// enforcing the October-2026 window.
const OCT_LOCAL = /^2026-10-(0[1-9]|[12]\d|3[01])T\d{2}:\d{2}(:\d{2})?$/;
const octoberLocal = z
  .string()
  .regex(OCT_LOCAL, { message: "Date must be in October 2026" });

const SubmitBaseSchema = z.object({
  id: z.string().uuid().optional(),
  path: z.enum(["external", "internal"]),
  title: z.string().trim().min(2, { message: "Event title must be at least 2 characters" }).max(200, { message: "Event title must be 200 characters or less" }),
  description: z.string().trim().min(1, { message: "Please enter a short description of the event" }).max(4000, { message: "Description must be 4,000 characters or less" }),
  host_org: z.string().trim().min(1, { message: "Please enter the host organization name" }).max(160),
  host_url: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      if (!t) return t;
      return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    },
    z.string().url({ message: "Please enter a valid website URL starting with https://" }).max(1000),
  ),
  host_org_type: z.string().trim().min(1, { message: "Please select an organization type" }).max(60),
  host_email: z.string().trim().min(1, { message: "Please enter a host email address" }).email({ message: "Please enter a valid email address (e.g., hello@your-org.com)" }).max(255),
  host_contact_name: z.string().trim().min(1, { message: "Please enter a contact person name" }).max(120),
  host_contact_phone: z.string().trim().min(5, { message: "Phone number is too short" }).max(40),
  host_contact_role: z.string().trim().max(120).optional().default(""),
  host_logo_url: z.string().trim().url({ message: "Please enter a valid logo URL" }).max(1000).optional().or(z.literal("")).transform((v) => v || null),
  image_url: z.string().trim().min(1, { message: "Please upload an event image" }).url({ message: "Please upload a valid event image" }).max(1000),
  week: z.enum(["w1", "w2", "w3", "w4"], { message: "Please select a week of programming" }),
  format: z.enum(["in-person", "virtual", "hybrid"], { message: "Please select an event format" }),
  region: z.string().trim().max(40).optional().default(""),
  city: z.string().trim().min(1, { message: "Please enter a city or area" }).max(120),
  venue: z.string().trim().max(200).optional().transform((v) => v || null),
  address: z.string().trim().max(300).optional().default(""),
  starts_at: octoberLocal,
  ends_at: octoberLocal.optional().or(z.literal("")).transform((v) => v || null),
  capacity: z.number().int({ message: "Capacity must be a whole number" }).positive({ message: "Capacity must be at least 1" }).max(100000, { message: "Capacity cannot exceed 100,000" }),
  cost_cents: z.number().int().min(0).max(100_000_00).default(0),
  external_url: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      if (!t) return t;
      return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    },
    z.string().url({ message: "Please enter a valid registration URL starting with https://" }).max(1000).optional().or(z.literal("")).transform((v) => v || null),
  ),
  topics: z.array(z.string().max(60)).min(1, { message: "Please pick at least one topic so attendees can find your event" }).max(20, { message: "Please limit topics to 20 or fewer" }),
  audience: z.array(z.string().max(60)).max(20).default([]),
  captchaToken: z.string().min(1).max(4096),
});


const SubmitSchema = SubmitBaseSchema
  .refine(
    (data) => {
      if (!data.ends_at) return true;
      return new Date(data.ends_at) > new Date(data.starts_at);
    },
    { message: "End time must be after the start time", path: ["ends_at"] }
  )
  .refine(
    (data) => {
      if (data.path !== "external" && data.format !== "virtual") return true;
      return !!data.external_url;
    },
    {
      message: "Please enter the URL where attendees can join or register for the event",
      path: ["external_url"],
    }
  )
  .refine(
    (data) => data.format === "virtual" || (data.address && data.address.trim().length > 0),
    { message: "Please enter a street address or location", path: ["address"] }
  );

export type SubmitEventInput = z.input<typeof SubmitSchema>;

export const submitEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SubmitEventInput) => SubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const captcha = await verifyTurnstileToken(data.captchaToken);
    if (!captcha.ok) throw new Error(captcha.error);
    const { supabase, userId } = context;
    const base = {

      organizer_id: userId,
      status: "pending" as const,
      path: data.path,
      title: data.title,
      description: data.description,
      host_org: data.host_org,
      host_url: data.host_url,
      host_org_type: data.host_org_type,
      host_email: data.host_email,
      host_contact_name: data.host_contact_name,
      host_contact_phone: data.host_contact_phone,
      host_contact_role: data.host_contact_role,
      host_logo_url: data.host_logo_url,
      image_url: data.image_url,
      week: data.week,
      format: data.format,
      region: data.region,
      city: data.city,
      venue: data.venue,
      address: data.address,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      capacity: data.capacity ?? null,
      cost_cents: data.cost_cents,
      external_url: data.external_url,
      topics: data.topics,
      audience: data.audience,
      denial_reason: null,
    };
    if (data.id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: existing } = await supabaseAdmin
        .from("events")
        .select("status, organizer_id")
        .eq("id", data.id)
        .maybeSingle();
      if (!existing) throw new Error("Event not found");

      const isOwner = existing.organizer_id === userId;
      const admin = isOwner ? false : await isAdmin(context);
      if (!isOwner && !admin) throw new Error("Forbidden");

      const patch: Database["public"]["Tables"]["events"]["Update"] = { ...base };
      // Admin edits keep the original organizer and don't push the event back into review.
      if (admin) {
        patch.organizer_id = existing.organizer_id;
        patch.status = existing.status;
      } else if (existing.status === "denied") {
        patch.resubmitted_at = new Date().toISOString();
      }

      const query = supabaseAdmin.from("events").update(patch).eq("id", data.id);
      const { data: row, error } = await query.select("id, title").single();
      if (error) throw new Error(error.message);
      if (!admin) {
        const { sendSubmissionReceived } = await import("./email.server");
        await sendSubmissionReceived(context.claims?.email as string | undefined, row.title);
      }
      return { ok: true as const, id: row.id };
    }

    const { data: row, error } = await supabase.from("events").insert(base).select("id, title").single();
    if (error) throw new Error(error.message);
    const { sendSubmissionReceived } = await import("./email.server");
    await sendSubmissionReceived(context.claims?.email as string | undefined, row.title);
    return { ok: true as const, id: row.id };
  });


// -------- Organizer's own events --------
export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("organizer_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { events: data ?? [] };
  });

export const getMyEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { event: null, viewerIsAdmin: false };
    const admin = await isAdmin(context);
    if (row.organizer_id !== context.userId && !admin) throw new Error("Forbidden");
    return { event: row, viewerIsAdmin: admin };
  });

// Registrations for organizer
export const listEventRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_registrations")
      .select("id, name, email, created_at")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { registrations: rows ?? [] };
  });

// Click count for organizer
export const getEventClickCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { count, error } = await context.supabase
      .from("event_clicks")
      .select("id", { count: "exact", head: true })
      .eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

// -------- Admin: list pending / approve / deny --------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isAdmin(ctx: { supabase: any; userId: string }): Promise<boolean> {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  return !!data;
}

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listAdminEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { filter?: "pending" | "approved" | "denied" | "all" }) =>
    z.object({ filter: z.enum(["pending", "approved", "denied", "all"]).default("pending") }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("events").select("*").order("created_at", { ascending: false });
    if (data.filter !== "all") q = q.eq("status", data.filter);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { events: rows ?? [] };
  });

// -------- Admin: export events + native RSVPs for backup --------
export const exportAdminData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scope: "events" | "registrations"; eventIds?: string[] }) =>
    z.object({
      scope: z.enum(["events", "registrations"]),
      eventIds: z.array(z.string().uuid()).max(10000).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.scope === "events") {
      let q = supabaseAdmin.from("events").select("*").order("starts_at", { ascending: true });
      if (data.eventIds && data.eventIds.length) q = q.in("id", data.eventIds);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: rows ?? [] };
    }

    // Native RSVPs only (path === 'internal'). Filter events, then registrations by those event ids.
    let evq = supabaseAdmin.from("events").select("id, title").eq("path", "internal");
    if (data.eventIds && data.eventIds.length) evq = evq.in("id", data.eventIds);
    const { data: evs, error: evErr } = await evq;
    if (evErr) throw new Error(evErr.message);
    const ids = (evs ?? []).map((e) => e.id);
    const titleById = new Map((evs ?? []).map((e) => [e.id, e.title]));
    if (!ids.length) return { rows: [] };
    const { data: regs, error: rErr } = await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .in("event_id", ids)
      .order("created_at", { ascending: true });
    if (rErr) throw new Error(rErr.message);
    const rows = (regs ?? []).map((r) => ({ ...r, event_title: titleById.get(r.event_id) ?? "" }));
    return { rows };
  });



export const approveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; note?: string }) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().max(2000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: Database["public"]["Tables"]["events"]["Update"] = {
      status: "approved",
      published_at: new Date().toISOString(),
      denial_reason: null,
    };
    if (data.note !== undefined) patch.admin_note = data.note || null;

    const { data: row, error } = await context.supabase
      .from("events")
      .update(patch)
      .eq("id", data.id)
      .select("id, title, organizer_id")
      .single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: udata } = await supabaseAdmin.auth.admin.getUserById(row.organizer_id);
    const { sendApproved } = await import("./email.server");
    await sendApproved(udata?.user?.email, row.title, row.id);
    return { ok: true as const };
  });

export const denyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("events")
      .update({ status: "denied", denial_reason: data.reason })
      .eq("id", data.id)
      .select("id, title, organizer_id")
      .single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: udata } = await supabaseAdmin.auth.admin.getUserById(row.organizer_id);
    const { sendDenied } = await import("./email.server");
    await sendDenied(udata?.user?.email, row.title, row.id, data.reason);
    return { ok: true as const };
  });

// -------- Admin CRUD --------
export const adminCreateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SubmitEventInput) => SubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const base = {
      organizer_id: context.userId,
      status: "approved" as const,
      path: data.path,
      title: data.title,
      description: data.description,
      host_org: data.host_org,
      host_url: data.host_url,
      host_org_type: data.host_org_type,
      host_email: data.host_email,
      host_contact_name: data.host_contact_name,
      host_contact_phone: data.host_contact_phone,
      host_contact_role: data.host_contact_role,
      host_logo_url: data.host_logo_url,
      image_url: data.image_url,
      week: data.week,
      format: data.format,
      region: data.region,
      city: data.city,
      venue: data.venue,
      address: data.address,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      capacity: data.capacity ?? null,
      cost_cents: data.cost_cents,
      external_url: data.external_url,
      topics: data.topics,
      audience: data.audience,
      published_at: new Date().toISOString(),
    };
    const { data: row, error } = await context.supabase.from("events").insert(base).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id };
  });

const AdminUpdateSchema = SubmitBaseSchema.omit({ captchaToken: true }).extend({ id: z.string().uuid() })
  .refine(
    (data) => {
      if (!data.ends_at) return true;
      return new Date(data.ends_at) > new Date(data.starts_at);
    },
    { message: "End time must be after the start time", path: ["ends_at"] }
  )
  .refine(
    (data) => {
      if (data.path !== "external") return true;
      return !!data.external_url;
    },
    { message: "Please enter the external registration URL where attendees can sign up", path: ["external_url"] }
  );

export const adminUpdateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof AdminUpdateSchema>) => AdminUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("events")
      .update(rest)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "pending" | "approved" | "denied" }) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "approved", "denied"]),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: Database["public"]["Tables"]["events"]["Update"] = { status: data.status };
    if (data.status === "approved") patch.published_at = new Date().toISOString();

    const { error } = await context.supabase.from("events").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminSetFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; scope: "home" | "week"; featured: boolean }) =>
    z.object({
      id: z.string().uuid(),
      scope: z.enum(["home", "week"]),
      featured: z.boolean(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch = data.scope === "home"
      ? { featured_home: data.featured }
      : { featured: data.featured };
    const { error } = await context.supabase.from("events").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Full admin view for a single event (any status), plus registrations, clicks, page views.
export const getAdminEventDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const supa = context.supabase;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: event, error } = await supabaseAdmin.from("events").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Not found");

    const [{ data: regs }, { count: clicks }, { count: views }] = await Promise.all([
      supa.from("event_registrations").select("id, name, email, created_at").eq("event_id", data.id).order("created_at", { ascending: false }),
      supa.from("event_clicks").select("id", { count: "exact", head: true }).eq("event_id", data.id),
      supa.from("page_views").select("id", { count: "exact", head: true }).eq("path", `/event/${data.id}`),
    ]);

    // Organizer info
    const { data: udata } = await supabaseAdmin.auth.admin.getUserById(event.organizer_id);

    return {
      event,
      organizer: {
        id: event.organizer_id,
        email: udata?.user?.email ?? null,
        name: (udata?.user?.user_metadata as { name?: string; full_name?: string } | null)?.name
          ?? (udata?.user?.user_metadata as { name?: string; full_name?: string } | null)?.full_name
          ?? null,
      },
      registrations: regs ?? [],
      clicks: clicks ?? 0,
      views: views ?? 0,
    };
  });

// Global registrations list (admin analytics)
export const listAllRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("event_registrations")
      .select("id, name, email, created_at, event_id, events(title)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { registrations: data ?? [] };
  });


// -------- Admin analytics: totals + top events --------
export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supa = supabaseAdmin;

    const countBy = async (status?: "pending" | "approved" | "denied") => {
      let q = supa.from("events").select("id", { count: "exact", head: true });
      if (status) q = q.eq("status", status);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    const [pending, approved, denied, total] = await Promise.all([
      countBy("pending"), countBy("approved"), countBy("denied"), countBy(),
    ]);

    const [{ count: regCount }, { count: clickCount }] = await Promise.all([
      supa.from("event_registrations").select("id", { count: "exact", head: true }),
      supa.from("event_clicks").select("id", { count: "exact", head: true }),
    ]);

    // Weekly breakdown of approved events
    const { data: approvedRows } = await supa
      .from("events").select("id, title, week, region, city, starts_at, capacity")
      .eq("status", "approved");

    const weekCounts: Record<string, number> = { w1: 0, w2: 0, w3: 0, w4: 0 };
    const cityCounts: Record<string, number> = {};
    for (const r of approvedRows ?? []) {
      if (r.week) weekCounts[r.week] = (weekCounts[r.week] ?? 0) + 1;
      if (r.city) cityCounts[r.city] = (cityCounts[r.city] ?? 0) + 1;
    }

    // Top events by registrations
    const { data: allApproved } = await supa
      .from("events").select("id, title, city, starts_at")
      .eq("status", "approved");
    const ids = (allApproved ?? []).map((e) => e.id);
    const perEventRegs: Record<string, number> = {};
    const perEventClicks: Record<string, number> = {};
    if (ids.length) {
      const { data: regs } = await supa
        .from("event_registrations").select("event_id").in("event_id", ids);
      for (const r of regs ?? []) perEventRegs[r.event_id] = (perEventRegs[r.event_id] ?? 0) + 1;
      const { data: clicks } = await supa
        .from("event_clicks").select("event_id").in("event_id", ids);
      for (const c of clicks ?? []) perEventClicks[c.event_id] = (perEventClicks[c.event_id] ?? 0) + 1;
    }
    const topEvents = (allApproved ?? [])
      .map((e) => ({
        id: e.id, title: e.title, city: e.city, starts_at: e.starts_at,
        registrations: perEventRegs[e.id] ?? 0,
        clicks: perEventClicks[e.id] ?? 0,
      }))
      .sort((a, b) => (b.registrations - a.registrations) || (b.clicks - a.clicks))
      .slice(0, 10);

    // Recent submissions (last 5 pending)
    const { data: recentPending } = await supa
      .from("events").select("id, title, host_org, city, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      totals: {
        pending, approved, denied, total,
        registrations: regCount ?? 0,
        clicks: clickCount ?? 0,
      },
      weekCounts,
      cityCounts,
      topEvents,
      recentPending: recentPending ?? [],
    };
  });


// -------- Owner: delete own event, notify registrants + admins --------
export const deleteMyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Load event & verify ownership via service role (base table hides PII from authenticated role).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ev, error: evErr } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.id)
      .eq("organizer_id", context.userId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Not found");

    // Registrants (only for internally-managed events).
    const { data: regs } = await context.supabase
      .from("event_registrations")
      .select("email, name")
      .eq("event_id", data.id);
    const registrants = (regs ?? []).filter((r) => !!r.email);

    // Find up to 3 similar upcoming approved events (same week first, then same track).
    const nowIso = new Date().toISOString();
    const { data: similarRows } = await context.supabase
      .from("events_public")
      .select("id, title, starts_at, venue, city, week, track")
      .eq("status", "approved")
      .gt("starts_at", nowIso)
      .neq("id", data.id)
      .or(
        [
          ev.week ? `week.eq.${ev.week}` : null,
          ev.track ? `track.eq.${ev.track}` : null,
        ].filter(Boolean).join(","),
      )
      .order("starts_at", { ascending: true })
      .limit(6);

    const similar = (similarRows ?? [])
      .slice(0, 3)
      .map((s: any) => ({
        title: s.title as string,
        url: `${process.env.APP_PUBLIC_URL || "https://witechmonth.com"}/event/${s.id}`,
        when: s.starts_at
          ? new Date(s.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
          : undefined,
        location: [s.venue, s.city].filter(Boolean).join(" · ") || undefined,
      }));

    // Load host + admin emails via service role BEFORE deletion.
    const { data: hostUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const hostEmail = hostUser?.user?.email ?? "";
    const hostName =
      (hostUser?.user?.user_metadata as any)?.name ||
      (hostUser?.user?.user_metadata as any)?.full_name ||
      hostEmail.split("@")[0] ||
      "Host";

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminEmails: string[] = [];
    for (const r of adminRoles ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      if (u?.user?.email) adminEmails.push(u.user.email);
    }

    // Delete the event (registrations & clicks cascade).
    const { error: delErr } = await context.supabase
      .from("events")
      .delete()
      .eq("id", data.id)
      .eq("organizer_id", context.userId);
    if (delErr) throw new Error(delErr.message);

    // Fire notifications (best-effort; failures don't undo deletion).
    const { sendEventCancelledToRegistrant, sendEventCancelledToAdmin } = await import("./email.server");
    for (const r of registrants) {
      try {
        await sendEventCancelledToRegistrant(r.email as string, (r.name as string) ?? null, ev, similar);
      } catch (e) {
        console.error("[deleteMyEvent] registrant email failed", e);
      }
    }
    for (const a of adminEmails) {
      try {
        await sendEventCancelledToAdmin(a, ev, hostName, hostEmail, registrants.length);
      } catch (e) {
        console.error("[deleteMyEvent] admin email failed", e);
      }
    }

    return { ok: true as const, notified: registrants.length, admins: adminEmails.length };
  });
