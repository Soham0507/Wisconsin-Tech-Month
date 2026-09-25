import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { WEEKS, displayCity } from "@/lib/wtm-data";
import { useServerFn } from "@tanstack/react-start";
import { listMyEvents, listEventRegistrations, getEventClickCount, deleteMyEvent } from "@/lib/events.functions";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CheckCircle2, Clock, AlertCircle, Edit3, Users, MousePointerClick, FileText, Eye, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export const Route = createFileRoute("/_authenticated/host/dashboard")({
  head: () => ({
    meta: [
      { title: "Host account — WTM 2026" },
      { name: "description", content: "Manage your WTM events, RSVPs, and submission status." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchMine = useServerFn(listMyEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["my-events"],
    queryFn: () => fetchMine(),
  });

  const events = data?.events ?? [];
  const pending = events.filter((e) => e.status === "pending").length;
  const approved = events.filter((e) => e.status === "approved").length;
  const denied = events.filter((e) => e.status === "denied").length;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary">Host account</div>
            <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Your events</h1>
            <p className="mt-1 text-muted-foreground">{events.length} events · manage submissions, RSVPs, and clicks</p>
          </div>
          <Link to="/host/submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal">
            Submit new event
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Kpi label="Approved & live" value={String(approved)} />
          <Kpi label="Pending review" value={String(pending)} />
          <Kpi label="Needs changes" value={String(denied)} />
        </div>

        <div className="mt-10 space-y-6">
          {isLoading && <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>}
          {!isLoading && events.length === 0 && (
            <div className="card-constellation rounded-2xl p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-4 font-display text-2xl font-bold">No events yet</h2>
              <p className="mt-2 text-muted-foreground">Submit your first event to get started.</p>
              <Link to="/host/submit" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                Submit an event
              </Link>
            </div>
          )}
          {events.map((e) => <EventRow key={e.id} event={e} />)}
        </div>
      </main>
      <Footer />
    </>
  );
}

function EventRow({ event }: { event: EventRow }) {
  const w = WEEKS[event.week as keyof typeof WEEKS];

  const fetchRegs = useServerFn(listEventRegistrations);
  const fetchClicks = useServerFn(getEventClickCount);
  const removeEvent = useServerFn(deleteMyEvent);
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isInternal = event.path === "internal";

  const regs = useQuery({
    queryKey: ["regs", event.id],
    queryFn: () => fetchRegs({ data: { eventId: event.id } }),
    enabled: isInternal && event.status === "approved",
  });
  const clicks = useQuery({
    queryKey: ["clicks", event.id],
    queryFn: () => fetchClicks({ data: { eventId: event.id } }),
    enabled: !isInternal && event.status === "approved",
  });

  const deleteMut = useMutation({
    mutationFn: () => removeEvent({ data: { id: event.id } }),
    onSuccess: (res) => {
      const notified = res?.notified ?? 0;
      toast.success(
        notified > 0
          ? `Event deleted. ${notified} registrant${notified === 1 ? "" : "s"} notified.`
          : "Event deleted.",
      );
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Could not delete event");
    },
  });

  const registrations = regs.data?.registrations ?? [];
  const capacity = event.capacity ?? 0;

  const exportCsv = () => {
    const rows = [["name", "email", "registered_at"]]
      .concat(registrations.map((r) => [r.name, r.email, r.created_at]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${event.id}-registrations.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="card-constellation overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={event.status} />
            {w && (
              <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                style={{ borderColor: w.color, color: w.color }}>
                {w.name}
              </span>
            )}
            <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {isInternal ? "Managed" : "External"}
            </span>
          </div>
          <h3 className="mt-2 font-display text-xl font-bold">{event.title}</h3>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {displayCity(event.city)} · {event.starts_at ? new Date(event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Date TBA"}
          </div>
          {event.status === "denied" && (
            <div className="mt-3 rounded-lg border border-secondary/40 bg-secondary/10 p-3 text-sm">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-secondary">
                <AlertCircle className="h-3 w-3" /> Reviewer feedback
              </div>
              {event.denial_reason && <p className="mt-1 text-foreground">{event.denial_reason}</p>}
              <Link
                to="/host/submit"
                search={{ id: event.id }}
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:opacity-90"
              >
                <Edit3 className="h-3 w-3" /> Edit & resubmit
              </Link>
            </div>
          )}

        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/event/$id"
            params={{ id: event.id }}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Eye className="h-3 w-3" /> {event.status === "approved" ? "View page" : "Preview"}
          </Link>
          <Link
            to="/host/submit"
            search={{ id: event.id }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:border-primary/60 hover:text-primary"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the event from the WTM calendar.
              {isInternal && regs.data?.registrations?.length
                ? ` ${regs.data.registrations.length} registered attendee${regs.data.registrations.length === 1 ? "" : "s"} will be emailed a cancellation notice with similar upcoming events.`
                : " Registrants (if any) will be emailed a cancellation notice."}
              {" "}The WTM admin team will also be notified. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={(e) => { e.preventDefault(); deleteMut.mutate(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="p-5">

        {event.status !== "approved" ? (
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Stats appear once approved.
          </div>
        ) : isInternal ? (
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Registrations</div>
                <div className="font-display text-2xl font-bold text-primary">
                  {registrations.length}{capacity ? ` / ${capacity}` : ""}
                </div>
              </div>
              {capacity > 0 && (
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, (registrations.length / capacity) * 100)}%` }} />
                </div>
              )}
              {registrations.length > 0 && (
                <button onClick={exportCsv} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">
                  Export CSV
                </button>
              )}
            </div>
            {registrations.length > 0 && (
              <div className="mt-4 max-h-56 overflow-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-background/40 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Registered</th></tr>
                  </thead>
                  <tbody>
                    {registrations.map((r) => (
                      <tr key={r.id} className="border-t border-border/40">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Registration clicks</div>
            <div className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-primary">
              <MousePointerClick className="h-5 w-5" />{clicks.data?.count ?? 0}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Every time a visitor clicks Register on your card or event page.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-constellation rounded-2xl p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-primary">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "draft" | "pending" | "approved" | "denied" }) {
  const map = {
    approved: { Icon: CheckCircle2, label: "Approved", cls: "border-primary/40 bg-primary/10 text-primary" },
    pending:  { Icon: Clock,        label: "Pending",  cls: "border-secondary/40 bg-secondary/10 text-secondary" },
    denied:   { Icon: AlertCircle, label: "Needs changes", cls: "border-secondary/40 bg-secondary/10 text-secondary" },
    draft:    { Icon: AlertCircle,  label: "Draft",    cls: "border-border bg-surface/60 text-muted-foreground" },
  } as const;
  const { Icon, label, cls } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

// Force lucide-react side-effect keeps Users icon if we later need it
void Users;
