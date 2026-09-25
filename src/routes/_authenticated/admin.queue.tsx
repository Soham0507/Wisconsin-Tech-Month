import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAdminEvents, approveEvent, denyEvent } from "@/lib/events.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WEEKS, displayCity } from "@/lib/wtm-data";
import { Check, X, ExternalLink, MapPin, Calendar } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";



type EventRow = Database["public"]["Tables"]["events"]["Row"];
type Filter = "pending" | "approved" | "denied" | "all";


const queueSearchSchema = z.object({
  highlight: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/admin/queue")({
  validateSearch: (s) => queueSearchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Admin queue — WTM 2026" },
      { name: "description", content: "Review, approve, and deny WTM event submissions." },
    ],
  }),
  component: AdminPage,
});


function AdminPage() {
  const { highlight } = Route.useSearch();
  const [filter, setFilter] = useState<Filter>("pending");
  const fetchList = useServerFn(listAdminEvents);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-events", filter],
    queryFn: () => fetchList({ data: { filter } }),
    retry: false,
  });

  const forbidden = error instanceof Error && /forbidden/i.test(error.message);


  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-primary">Admin</div>
          <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Approval queue</h1>
          <p className="mt-1 text-muted-foreground">Review event submissions and publish them to the calendar.</p>
          <div className="mt-3">
            <Link to="/admin" className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
              ← Back to admin dashboard
            </Link>
          </div>
        </div>



        {forbidden ? (
          <div className="mt-8 card-constellation rounded-2xl p-8">
            <div className="font-display text-xl font-bold">Not authorized</div>
            <p className="mt-2 text-muted-foreground">You need the admin role to view this page.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground/80">
              Review each pending submission and choose <span className="font-semibold text-primary">Approve</span> or <span className="font-semibold text-destructive">Deny</span>. Denials require a reason that emails the organizer.
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {(["pending", "approved", "denied", "all"] as Filter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${filter === f ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground/70 hover:border-primary/40"}`}>
                  {f}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {isLoading && <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>}
              {data?.events.length === 0 && (
                <div className="card-constellation rounded-2xl p-6 text-center text-muted-foreground">
                  Nothing here.
                </div>
              )}
              {data?.events.map((e) => <AdminEventCard key={e.id} event={e} highlighted={e.id === highlight} />)}
            </div>
          </>
        )}

      </main>
      <Footer />
    </>
  );
}

function AdminEventCard({ event, highlighted = false }: { event: EventRow; highlighted?: boolean }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveEvent);
  const deny = useServerFn(denyEvent);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [showDeny, setShowDeny] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [ringOn, setRingOn] = useState(highlighted);

  const w = WEEKS[event.week as keyof typeof WEEKS];

  useEffect(() => {
    if (!highlighted) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setRingOn(true);
    const t = setTimeout(() => setRingOn(false), 2500);
    return () => clearTimeout(t);
  }, [highlighted]);

  const doApprove = async () => {
    setBusy(true); setErr(null);
    try {
      await approve({ data: { id: event.id, note: note.trim() || undefined } });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      qc.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success(`Approved "${event.title}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setErr(msg);
      toast.error(`Approve failed: ${msg}`);
    } finally { setBusy(false); }
  };

  const doDeny = async () => {
    if (!reason.trim()) return;
    setBusy(true); setErr(null);
    try {
      await deny({ data: { id: event.id, reason: reason.trim() } });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      qc.invalidateQueries({ queryKey: ["admin-analytics"] });
      setShowDeny(false); setReason("");
      toast.success(`Denied "${event.title}" — organizer notified`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setErr(msg);
      toast.error(`Deny failed: ${msg}`);
    } finally { setBusy(false); }
  };


  return (
    <div ref={cardRef} className={`card-constellation rounded-2xl p-5 transition-all ${ringOn ? "ring-2 ring-primary shadow-glow-teal" : ""}`}>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
              event.status === "pending" ? "border-secondary/40 bg-secondary/10 text-secondary" :
              event.status === "approved" ? "border-primary/40 bg-primary/10 text-primary" :
              "border-destructive/40 bg-destructive/10 text-destructive"
            }`}>{event.status}</span>
            {w && <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: w.color, color: w.color }}>{w.name}</span>}
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {event.path}
            </span>
            {event.resubmitted_at && (
              <span className="rounded-full border border-secondary/60 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-secondary">
                Resubmitted
              </span>
            )}
          </div>

          <h3 className="mt-2 font-display text-xl font-bold">{event.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" />{event.starts_at ? new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Date TBA"}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{displayCity(event.city)}</span>
            <span>{event.host_org}</span>
          </div>
          {event.external_url && (
            <a href={event.external_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline">
              External link <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {event.status === "pending" && (
          <div className="flex flex-col gap-2">
            <Link
              to="/event/$id"
              params={{ id: event.id }}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-secondary/50 bg-secondary/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Preview
            </Link>
            <button disabled={busy} onClick={doApprove}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground hover:shadow-glow-teal disabled:opacity-50">
              <Check className="h-3 w-3" /> Approve
            </button>
            <button disabled={busy} onClick={() => setShowDeny((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-foreground/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-foreground/10 disabled:opacity-50">
              <X className="h-3 w-3" /> Deny
            </button>
          </div>
        )}
      </div>
      {event.status === "pending" && (
        <div className="mt-3">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Optional admin note (kept private)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-background/40 p-2 text-sm"
            rows={2} placeholder="Add an internal note — visible on the admin event page." />
        </div>
      )}

      {showDeny && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-destructive">Reason for denial</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background/40 p-2 text-sm"
            rows={3} placeholder="Tell the organizer what to change…" />
          <div className="mt-2 flex gap-2">
            <button disabled={busy || !reason.trim()} onClick={doDeny}
              className="rounded-full border border-foreground/50 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:bg-foreground/10 disabled:opacity-50">
              Send denial
            </button>
            <button disabled={busy} onClick={() => setShowDeny(false)}
              className="rounded-full border border-border px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
      {err && <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{err}</div>}
    </div>
  );
}
