import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminEventDetail, adminDeleteEvent, adminSetStatus, adminSetFeatured } from "@/lib/events.functions";
import { WEEKS, displayCity } from "@/lib/wtm-data";
import {
  ArrowLeft, Edit3, Trash2, ExternalLink, Users, MousePointerClick, Eye, Calendar,
  MapPin, CheckCircle2, XCircle, Clock, StickyNote, Star,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/event/$id")({
  head: () => ({
    meta: [
      { title: "Event details — WTM Admin" },
      { name: "description", content: "Admin view of an event: analytics, registrations, edit, delete." },
    ],
  }),
  component: AdminEventPage,
});

function AdminEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getAdminEventDetail);
  const del = useServerFn(adminDeleteEvent);
  const setStatus = useServerFn(adminSetStatus);
  const setFeatured = useServerFn(adminSetFeatured);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-event", id],
    queryFn: () => fetchDetail({ data: { id } }),
    retry: false,
  });

  const forbidden = error instanceof Error && /forbidden/i.test(error.message);
  if (forbidden) {
    return (<><Header /><main className="mx-auto max-w-3xl px-5 py-10"><h1 className="font-display text-3xl font-bold">Not authorized</h1></main><Footer /></>);
  }

  const doDelete = async () => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setBusy(true);
    try {
      await del({ data: { id } });
      navigate({ to: "/admin/calendar" });
    } finally { setBusy(false); }
  };

  const doStatus = async (status: "pending" | "approved" | "denied") => {
    setBusy(true);
    try {
      await setStatus({ data: { id, status } });
      qc.invalidateQueries({ queryKey: ["admin-event", id] });
    } finally { setBusy(false); }
  };

  const toggleFeatured = async (scope: "home" | "week") => {
    if (!data) return;
    const current = scope === "home" ? !!data.event.featured_home : !!data.event.featured;
    setBusy(true);
    try {
      await setFeatured({ data: { id, scope, featured: !current } });
      qc.invalidateQueries({ queryKey: ["admin-event", id] });
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [["name", "email", "registered_at"]]
      .concat(data.registrations.map((r) => [r.name, r.email, r.created_at]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${id}-registrations.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/admin/calendar" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Manage calendar
        </Link>

        {isLoading && <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>}

        {data && (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={data.event.status} />
                  {WEEKS[data.event.week as keyof typeof WEEKS] && (
                    <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                      style={{ borderColor: WEEKS[data.event.week as keyof typeof WEEKS].color, color: WEEKS[data.event.week as keyof typeof WEEKS].color }}>
                      {WEEKS[data.event.week as keyof typeof WEEKS].name}
                    </span>
                  )}
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {data.event.path}
                  </span>
                </div>
                <h1 className="mt-3 font-display text-4xl font-bold">{data.event.title}</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">{data.event.description}</p>
                <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" />{data.event.starts_at ? new Date(data.event.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Date TBA"}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" />{displayCity(data.event.city)}{data.event.venue ? ` · ${data.event.venue}` : ""}</span>

                  <span>{data.event.host_org}</span>
                </div>
                {data.event.external_url && (
                  <a href={data.event.external_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline">
                    External link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to="/host/submit"
                  search={{ id: data.event.id }}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </Link>
                <Link
                  to="/event/$id"
                  params={{ id: data.event.id }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                  <Eye className="h-3 w-3" /> Public page
                </Link>
                <button
                  disabled={busy}
                  onClick={doDelete}
                  className="inline-flex items-center gap-1 rounded-full border border-foreground/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground hover:bg-foreground/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>

            {/* Status controls */}
            <section className="mt-6 card-constellation rounded-2xl p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => doStatus("approved")} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground disabled:opacity-50">
                  <CheckCircle2 className="h-3 w-3" /> Approve / publish
                </button>
                <button disabled={busy} onClick={() => doStatus("pending")} className="inline-flex items-center gap-1 rounded-full border border-secondary/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-secondary disabled:opacity-50">
                  <Clock className="h-3 w-3" /> Mark pending
                </button>
                <button disabled={busy} onClick={() => doStatus("denied")} className="inline-flex items-center gap-1 rounded-full border border-foreground/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-foreground disabled:opacity-50 hover:bg-foreground/10">
                  <XCircle className="h-3 w-3" /> Unpublish / deny
                </button>
                <button
                  disabled={busy}
                  onClick={() => toggleFeatured("home")}
                  className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest disabled:opacity-50 ${data.event.featured_home ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-primary"}`}
                  title={data.event.featured_home ? "Remove from the homepage" : "Feature on the homepage"}
                >
                  <Star className={`h-3 w-3 ${data.event.featured_home ? "fill-primary" : ""}`} />
                  {data.event.featured_home ? "Featured on homepage" : "Feature on homepage"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => toggleFeatured("week")}
                  className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest disabled:opacity-50 ${data.event.featured ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-primary"}`}
                  title={data.event.featured ? `Remove from ${WEEKS[data.event.week as keyof typeof WEEKS]?.name ?? "week"} page` : `Feature on ${WEEKS[data.event.week as keyof typeof WEEKS]?.name ?? "week"} page`}
                >
                  <Star className={`h-3 w-3 ${data.event.featured ? "fill-primary" : ""}`} />
                  {data.event.featured
                    ? `Featured on ${WEEKS[data.event.week as keyof typeof WEEKS]?.name ?? "week"}`
                    : `Feature on ${WEEKS[data.event.week as keyof typeof WEEKS]?.name ?? "week"} page`}
                </button>
              </div>
              {data.event.denial_reason && (
                <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="font-mono text-[10px] uppercase tracking-widest">Denial reason</div>
                  <div className="mt-1">{data.event.denial_reason}</div>
                </div>
              )}
              {data.event.admin_note && (
                <div className="mt-3 rounded border border-primary/40 bg-primary/5 p-3 text-sm">
                  <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                    <StickyNote className="h-3 w-3" /> Admin note
                  </div>
                  <div className="mt-1">{data.event.admin_note}</div>
                </div>
              )}
            </section>

            {/* Analytics */}
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat icon={<Users className="h-4 w-4" />} label="Registrations" value={data.registrations.length} tone="primary" />
              <Stat icon={<MousePointerClick className="h-4 w-4" />} label="External clicks" value={data.clicks} tone="secondary" />
              <Stat icon={<Eye className="h-4 w-4" />} label="Page views" value={data.views} />
            </section>

            {/* Organizer */}
            <section className="mt-6 card-constellation rounded-2xl p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Organizer</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{data.organizer.name ?? "(no name)"}</div>
                  <div className="text-sm text-muted-foreground">{data.organizer.email ?? "(no email)"}</div>
                </div>
                <Link
                  to="/admin/users/$id"
                  params={{ id: data.organizer.id }}
                  className="rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                  View profile
                </Link>
              </div>
            </section>

            {/* Host contact (admin reference only) */}
            <section className="mt-6 card-constellation rounded-2xl p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Host contact</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Organization</div>
                  <div className="mt-0.5 text-sm">{data.event.host_org}{data.event.host_org_type ? ` · ${data.event.host_org_type}` : ""}</div>
                  {data.event.host_url && (
                    <a href={data.event.host_url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      {data.event.host_url} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Contact person</div>
                  <div className="mt-0.5 text-sm">
                    {data.event.host_contact_name || <span className="text-muted-foreground">(not provided)</span>}
                    {data.event.host_contact_role ? <span className="text-muted-foreground"> — {data.event.host_contact_role}</span> : null}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</div>
                  <div className="mt-0.5 text-sm">
                    {data.event.host_email ? (
                      <a href={`mailto:${data.event.host_email}`} className="text-primary hover:underline">{data.event.host_email}</a>
                    ) : <span className="text-muted-foreground">(not provided)</span>}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Phone</div>
                  <div className="mt-0.5 text-sm">
                    {data.event.host_contact_phone ? (
                      <a href={`tel:${data.event.host_contact_phone}`} className="text-primary hover:underline">{data.event.host_contact_phone}</a>
                    ) : <span className="text-muted-foreground">(not provided)</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* Registrations */}
            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Registrations ({data.registrations.length})</h2>
                {data.registrations.length > 0 && (
                  <button onClick={exportCsv} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">
                    Export CSV
                  </button>
                )}
              </div>
              {data.registrations.length === 0 ? (
                <div className="mt-3 card-constellation rounded-xl p-4 text-sm text-muted-foreground">No registrations yet.</div>
              ) : (
                <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-background/40 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Registered</th></tr>
                    </thead>
                    <tbody>
                      {data.registrations.map((r) => (
                        <tr key={r.id} className="border-t border-border/40">
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "primary" | "secondary" }) {
  const cls = tone === "primary" ? "text-primary" : tone === "secondary" ? "text-secondary" : "text-foreground";
  return (
    <div className="card-constellation rounded-2xl p-5">
      <div className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest ${cls}`}>{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "approved" ? "border-primary/40 bg-primary/10 text-primary" :
    status === "pending" ? "border-secondary/40 bg-secondary/10 text-secondary" :
    "border-destructive/40 bg-destructive/10 text-destructive";
  return (<span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}>{status}</span>);
}
