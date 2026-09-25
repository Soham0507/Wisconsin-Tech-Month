import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://witechmonth.com";

function serverPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/about", priority: "0.8", changefreq: "weekly" },
          { path: "/map", priority: "0.9", changefreq: "weekly" },
          { path: "/calendar", priority: "0.9", changefreq: "weekly" },
          { path: "/sponsor", priority: "0.7", changefreq: "monthly" },
          { path: "/host", priority: "0.7", changefreq: "monthly" },
          { path: "/auth", priority: "0.5", changefreq: "monthly" },
          { path: "/reset-password", priority: "0.3", changefreq: "yearly" },
          { path: "/unsubscribe", priority: "0.3", changefreq: "yearly" },
          { path: "/admin", priority: "0.5", changefreq: "weekly" },
          { path: "/admin/admins", priority: "0.4", changefreq: "monthly" },
          { path: "/admin/analytics", priority: "0.5", changefreq: "weekly" },
          { path: "/admin/queue", priority: "0.5", changefreq: "weekly" },
          { path: "/admin/calendar", priority: "0.5", changefreq: "weekly" },
          { path: "/host/dashboard", priority: "0.5", changefreq: "weekly" },
          { path: "/host/submit", priority: "0.6", changefreq: "monthly" },
          { path: "/week/mke-tech-week", priority: "0.8", changefreq: "weekly" },
          { path: "/week/dev-week", priority: "0.8", changefreq: "weekly" },
          { path: "/week/women-in-tech-week", priority: "0.8", changefreq: "weekly" },
          { path: "/week/midwest-tech-week", priority: "0.8", changefreq: "weekly" },
        ];

        const supa = serverPublicClient();
        const { data: events, error } = await supa
          .from("events_public")
          .select("id, updated_at")
          .order("starts_at", { ascending: true });

        if (error) {
          console.error("[sitemap] events fetch error:", error);
        }

        const eventEntries: SitemapEntry[] = (events ?? []).map((e) => ({
          path: `/event/${e.id}`,
          priority: "0.6",
          changefreq: "weekly",
        }));

        const entries = [...staticEntries, ...eventEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
