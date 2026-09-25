import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { listAdminEvents, exportAdminData } from "@/lib/events.functions";
import { WEEKS, displayCity } from "@/lib/wtm-data";
import { useState } from "react";
import { CalendarDays, Plus, ArrowLeft, MapPin, Calendar as CalIcon, Download } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { downloadCSV, toCSV } from "@/lib/csv";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type Filter = "approved" | "pending" | "denied" | "all";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  head: () => ({
    meta: [
      { title: "Manage calendar — WTM Admin" },
      { name: "description", content: "Admin calendar with edit, analytics, and add-event tools." },
    ],
  }),
  component: AdminCalendar,
});

function AdminCalendar() {
  const [filter, setFilter] = useState<Filter>("approved");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const fetchList = useServerFn(listAdminEvents);
  const runExport = useServerFn(exportAdminData);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-calendar", filter],
    queryFn: () => fetchList({ data: { filter } }),
    retry: false,
  });
  const forbidden = error instanceof Error && /forbidden/i.test(error.message);

  const q = search.trim().toLowerCase();
  const events = (data?.events ?? []).filter((e) =>
    !q || [e.title, e.city, e.host_org, e.description].join(" ").toLowerCase().includes(q));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const exportMut = useMutation({
    mutationFn: async (kind: "all-events" | "selected-events" | "rsvps") => {
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "all-events") {
        const { rows } = await runExport({ data: { scope: "events" } });
        downloadCSV(`wtm-events-all-${stamp}.csv`, toCSV(rows as Array<Record<string, unknown>>));
        return rows.length;
      }
      if (kind === "selected-events") {
        const ids = Array.from(selected);
        if (!ids.length) throw new Error("Select at least one event first.");
        const { rows } = await runExport({ data: { scope: "events", eventIds: ids } });
        downloadCSV(`wtm-events-selected-${stamp}.csv`, toCSV(rows as Array<Record<string, unknown>>));
        return rows.length;
      }
      const ids = Array.from(selected);
      const { rows } = await runExport({
        data: { scope: "registrations", eventIds: ids.length ? ids : undefined },
      });
      const label = ids.length ? "selected" : "all";
      downloadCSV(`wtm-rsvps-${label}-${stamp}.csv`, toCSV(rows as Array<Record<string, unknown>>));
      return rows.length;
    },
    onSettled: () => setMenuOpen(false),
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Admin dashboard
        </Link>
        <div className="mt-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
          <CalendarDays className="h-3.5 w-3.5" /> Admin
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold md:text-5xl">Manage calendar</h1>
            <p className="mt-1 text-muted-foreground">All events across every status. Click any event to edit or view analytics.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/60 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest hover:border-primary/60"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur">
                  <ExportItem
                    label="Export all events (CSV)"
                    sub="Every event and every field in the database."
                    onClick={() => exportMut.mutate("all-events")}
                    busy={exportMut.isPending}
                  />
                  <ExportItem
                    label={`Export selected events (${selected.size})`}
                    sub="Check events below, then export just those."
                    disabled={selected.size === 0 || exportMut.isPending}
                    onClick={() => exportMut.mutate("selected-events")}
                    busy={exportMut.isPending}
                  />
                  <ExportItem
                    label={selected.size ? `Export native RSVPs (selected)` : "Export native RSVPs (all)"}
                    sub="Registrations for events using WTM's built-in RSVP. External-link events are excluded."
                    onClick={() => exportMut.mutate("rsvps")}
                    busy={exportMut.isPending}
                  />
                  {exportMut.error instanceof Error && (
                    <div className="px-3 py-2 text-xs text-destructive">{exportMut.error.message}</div>
                  )}
                </div>
              )}
            </div>
            <Link to="/host/submit" className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground hover:shadow-glow-teal">
              <Plus className="h-3.5 w-3.5" /> Add event
            </Link>
          </div>
        </div>

        {forbidden ? (
          <div className="mt-8 card-constellation rounded-2xl p-8">
            <div className="font-display text-xl font-bold">Not authorized</div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {(["approved", "pending", "denied", "all"] as Filter[]).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${filter === f ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground/70 hover:border-primary/40"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <input
                type="search"
                placeholder="Search events…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ml-auto min-w-[240px] rounded-full border border-border bg-background/40 px-4 py-2 text-sm"
              />
            </div>

            {events.length > 0 && (
              <div className="mt-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.size === events.length ? new Set() : new Set(events.map((e) => e.id)),
                    )
                  }
                  className="rounded-full border border-border px-3 py-1 hover:border-primary/60"
                >
                  {selected.size === events.length ? "Clear selection" : "Select all in view"}
                </button>
                <span>{selected.size} selected</span>
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {isLoading && <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>}
              {!isLoading && events.length === 0 && (
                <div className="col-span-full card-constellation rounded-2xl p-6 text-center text-muted-foreground">No events match.</div>
              )}
              {events.map((e) => (
                <AdminCalCard key={e.id} event={e} checked={selected.has(e.id)} onToggle={() => toggle(e.id)} />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function ExportItem({ label, sub, onClick, disabled, busy }: { label: string; sub: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="block w-full rounded-xl px-3 py-2 text-left hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="font-mono text-[11px] uppercase tracking-widest text-foreground">{busy ? "Working…" : label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function AdminCalCard({ event, checked, onToggle }: { event: EventRow; checked: boolean; onToggle: () => void }) {
  const w = WEEKS[event.week as keyof typeof WEEKS];
  return (
    <div className={`card-constellation relative rounded-2xl p-5 transition-all hover:border-primary/60 hover:shadow-glow-teal ${checked ? "ring-2 ring-primary/60" : ""}`}>
      <label className="absolute right-4 top-4 z-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/60">
        <input type="checkbox" checked={checked} onChange={onToggle} className="h-3.5 w-3.5 accent-primary" />
        Select
      </label>
      <Link to="/admin/event/$id" params={{ id: event.id }} className="block">
        <div className="flex flex-wrap items-center gap-2 pr-24">
          <StatusChip status={event.status} />
          {w && <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: w.color, color: w.color }}>{w.name}</span>}
          {event.resubmitted_at && (
            <span className="rounded-full border border-secondary/60 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-secondary">Resubmitted</span>
          )}
        </div>
        <h3 className="mt-2 font-display text-lg font-bold">{event.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1"><CalIcon className="h-3 w-3 text-primary" />{event.starts_at ? new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "TBA"}</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{displayCity(event.city)}</span>

          <span>{event.host_org}</span>
        </div>
      </Link>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "approved" ? "border-primary/40 bg-primary/10 text-primary" :
    status === "pending" ? "border-secondary/40 bg-secondary/10 text-secondary" :
    "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}>{status}</span>
  );
}
