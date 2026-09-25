import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const EVENT_FIELDS =
  "id, title, summary, city, region, week, track, topics, format, starts_at, ends_at, venue, host_org, external_url, capacity, cost_cents, featured";

export default defineTool({
  name: "search_events",
  title: "Search Wisconsin Tech Month events",
  description:
    "Search published Wisconsin Tech Month events by keyword, city, programming week, or date range. Returns upcoming events first.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Keyword matched against title, summary, and city."),
    city: z.string().trim().min(1).optional().describe("City name, e.g. Milwaukee or Madison."),
    week: z.string().trim().min(1).optional().describe("Programming week slug or name."),
    from: z.string().trim().min(4).optional().describe("Only events starting on or after this ISO date."),
    to: z.string().trim().min(4).optional().describe("Only events starting on or before this ISO date."),
    limit: z.number().int().min(1).max(50).default(20).optional().describe("Maximum events to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, week, from, to, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("events_public")
      .select(EVENT_FIELDS)
      .eq("status", "approved")
      .order("starts_at", { ascending: true })
      .limit(limit ?? 20);

    if (city) q = q.ilike("city", `%${city}%`);
    if (week) q = q.ilike("week", `%${week}%`);
    if (from) q = q.gte("starts_at", from);
    if (to) q = q.lte("starts_at", to);
    if (query) q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%,city.ilike.%${query}%`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
