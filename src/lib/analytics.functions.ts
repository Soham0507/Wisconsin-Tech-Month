import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// Public: log a page view. Called from the root route on navigation.
export const trackPageView = createServerFn({ method: "POST" })
  .inputValidator((d: { path: string; session_id: string; referrer?: string }) =>
    z.object({
      path: z.string().trim().min(1).max(500),
      session_id: z.string().trim().min(4).max(80),
      referrer: z.string().trim().max(1000).optional(),
    }).parse(d))
  .handler(async ({ data }) => {
    const supa = serverPublicClient();
    await supa.from("page_views").insert({
      path: data.path,
      session_id: data.session_id,
      referrer: data.referrer || null,
    });
    return { ok: true as const };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Site-wide traffic analytics for the last N days.
export const getSiteAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { days?: number }) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).default({ days: 30 }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    const { data: views, error: viewsErr } = await supabaseAdmin
      .from("page_views")
      .select("path, session_id, referrer, viewed_at")
      .gte("viewed_at", since)
      .limit(50000);
    if (viewsErr) throw new Error(viewsErr.message);
    const rows = views ?? [];

    // Daily buckets
    const dayViews = new Map<string, number>();
    const dayUniques = new Map<string, Set<string>>();
    const pageViews = new Map<string, number>();
    const pageUniques = new Map<string, Set<string>>();
    const referrers = new Map<string, number>();
    const uniqueSessions = new Set<string>();

    for (const r of rows) {
      const day = (r.viewed_at as string).slice(0, 10);
      dayViews.set(day, (dayViews.get(day) ?? 0) + 1);
      if (!dayUniques.has(day)) dayUniques.set(day, new Set());
      dayUniques.get(day)!.add(r.session_id);

      pageViews.set(r.path, (pageViews.get(r.path) ?? 0) + 1);
      if (!pageUniques.has(r.path)) pageUniques.set(r.path, new Set());
      pageUniques.get(r.path)!.add(r.session_id);

      uniqueSessions.add(r.session_id);

      if (r.referrer) {
        try {
          const host = new URL(r.referrer).hostname;
          if (host) referrers.set(host, (referrers.get(host) ?? 0) + 1);
        } catch {
          referrers.set(r.referrer, (referrers.get(r.referrer) ?? 0) + 1);
        }
      }
    }

    // Build zero-filled trend array of last N days
    const trend: { day: string; views: number; uniques: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const day = d.toISOString().slice(0, 10);
      trend.push({
        day,
        views: dayViews.get(day) ?? 0,
        uniques: dayUniques.get(day)?.size ?? 0,
      });
    }

    const topPages = [...pageViews.entries()]
      .map(([path, views]) => ({ path, views, uniques: pageUniques.get(path)?.size ?? 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const topReferrers = [...referrers.entries()]
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Daily registrations trend
    const { data: regs } = await supabaseAdmin
      .from("event_registrations")
      .select("created_at")
      .gte("created_at", since);
    const regsByDay = new Map<string, number>();
    for (const r of regs ?? []) {
      const day = (r.created_at as string).slice(0, 10);
      regsByDay.set(day, (regsByDay.get(day) ?? 0) + 1);
    }
    const regTrend = trend.map((t) => ({ day: t.day, count: regsByDay.get(t.day) ?? 0 }));

    return {
      totalViews: rows.length,
      uniqueVisitors: uniqueSessions.size,
      trend,
      regTrend,
      topPages,
      topReferrers,
      days: data.days,
    };
  });
