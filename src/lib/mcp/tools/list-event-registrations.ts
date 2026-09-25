import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_event_registrations",
  title: "List registrations for my event",
  description:
    "List the people registered for one of the signed-in host's own events. Only the event's organizer (or an admin) can read these rows.",
  inputSchema: {
    event_id: z.string().uuid().describe("Event id owned by the signed-in host."),
    limit: z.number().int().min(1).max(500).default(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("event_registrations")
      .select("id, name, email, created_at")
      .eq("event_id", event_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 200);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: data?.length ?? 0, registrations: data ?? [] }, null, 2),
        },
      ],
      structuredContent: { count: data?.length ?? 0, registrations: data ?? [] },
    };
  },
});
