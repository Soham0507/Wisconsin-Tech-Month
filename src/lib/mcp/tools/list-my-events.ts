import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_events",
  title: "List my hosted events",
  description:
    "List the events the signed-in host has submitted, including their review status (draft, pending, approved, denied).",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Optional status filter, e.g. approved or pending."),
    limit: z.number().int().min(1).max(100).default(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("events")
      .select("id, title, city, week, status, starts_at, ends_at, capacity, external_url, created_at, updated_at")
      .eq("organizer_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status as never);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
