import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchEventsTool from "./tools/search-events";
import getEventTool from "./tools/get-event";
import listMyEventsTool from "./tools/list-my-events";
import listEventRegistrationsTool from "./tools/list-event-registrations";

// Must be the direct Supabase host: the publish-time proxy URL fails RFC 8414 issuer matching.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "wisconsin-tech-month",
  title: "Wisconsin Tech Month",
  version: "0.1.0",
  instructions:
    "Tools for Wisconsin Tech Month. Use `search_events` and `get_event` to browse published events across Wisconsin. Hosts can use `list_my_events` to review their own submissions and `list_event_registrations` to see who registered for one of their events.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchEventsTool, getEventTool, listMyEventsTool, listEventRegistrationsTool],
});
