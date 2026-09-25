import type { Database } from "@/integrations/supabase/types";
import type { WTMEvent, WeekKey, EventFormat } from "./wtm-data";

export type DbEvent = Database["public"]["Tables"]["events"]["Row"];

/** Map a DB event row into the shape the UI components already consume. */
export function dbEventToWtm(row: DbEvent): WTMEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    week: (row.week as WeekKey) ?? "w1",
    format: row.format as EventFormat,
    region: row.region ?? undefined,
    city: row.city,
    venue: row.venue ?? "",
    address: row.address ?? "",
    date: row.starts_at ?? new Date().toISOString(),
    endDate: row.ends_at ?? undefined,
    topics: row.topics ?? [],
    audience: row.audience ?? [],
    host: row.host_org,
    image: row.image_url ?? undefined,
    registrationUrl: row.path === "external" ? (row.external_url ?? "#") : `/event/${row.id}`,
    capacity: row.capacity ?? undefined,
    status: row.status === "approved" ? "approved" : "pending",
    createdAt: row.created_at,
  };
}
