import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminAnalytics, listAllRegistrations } from "@/lib/events.functions";
import { getSiteAnalytics } from "@/lib/analytics.functions";
import { useState } from "react";
import {
  ArrowLeft, BarChart3, CalendarDays, MousePointerClick, Users,
  Inbox, CheckCircle2, XCircle, TrendingUp, Eye, Globe,
} from "lucide-react";

type Tab = "overview" | "traffic" | "events" | "registrations";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — WTM Admin" },
      { name: "description", content: "Site views, top pages, event registrations, and per-event performance." },
    ],
  }),
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const [tab, setTab] = useState<Tab>("overview");
  const fetchStats = useServerFn(getAdminAnalytics);
  const fetchSite = useServerFn(getSiteAnalytics);
  const fetchRegs = useServerFn(listAllRegistrations);

  const events = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fetchStats(), retry: false });
  const site = useQuery({ queryKey: ["site-analytics", 30], queryFn: () => fetchSite({ data: { days: 30 } }), retry: false });
  const regs = useQuery({
    queryKey: ["all-registrations"],
    queryFn: () => fetchRegs(),
    enabled: tab === "registrations",
    retry: false,
  });

  const forbidden = events.error instanceof Error && /forbidden/i.test(events.error.message);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Admin dashboard
        </Link>
        <div className="mt-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
          <BarChart3 className="h-3.5 w-3.5" /> Analytics
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Site traffic, event performance, and registrations for Wisconsin Tech Month.</p>

        {forbidden ? (
          <div className="mt-8 card-constellation rounded-2xl p-8">
            <div className="font-display text-xl font-bold">Not authorized</div>
          </div>
        ) : (
          <>
            <div className="mt-6 inline-flex flex-wrap rounded-full border border-border bg-surface/40 p-1 font-mono text-[11px] uppercase tracking-widest">
              {(["overview", "traffic", "events", "registrations"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>

            {tab === "overview" && <OverviewTab events={events.data} site={site.data} />}
            {tab === "traffic" && <TrafficTab site={site.data} loading={site.isLoading} />}
            {tab === "events" && <EventsTab events={events.data} loading={events.isLoading} />}
            {tab === "registrations" && <RegistrationsTab regs={regs.data} loading={regs.isLoading} />}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function OverviewTab({ events, site }: { events: any; site: any }) {
  return (
    <>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Eye className="h-4 w-4" />} label="Site views (30d)" value={site?.totalViews} tone="primary" />
        <Stat icon={<Globe className="h-4 w-4" />} label="Unique visitors (30d)" value={site?.uniqueVisitors} />
        <Stat icon={<Users className="h-4 w-4" />} label="Registrations" value={events?.totals.registrations} tone="primary" />
        <Stat icon={<MousePointerClick className="h-4 w-4" />} label="External clicks" value={events?.totals.clicks} tone="secondary" />
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={<Inbox className="h-4 w-4" />} label="Pending" value={events?.totals.pending} />
        <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={events?.totals.approved} tone="primary" />
        <Stat icon={<XCircle className="h-4 w-4" />} label="Denied" value={events?.totals.denied} tone="destructive" />
      </section>

      {site?.trend && (
        <section className="mt-8 card-constellation rounded-2xl p-6">
          <h3 className="font-display text-lg font-bold">Last 30 days</h3>
          <p className="mt-1 text-xs text-muted-foreground">Site views (teal) and registrations (orange) per day.</p>
          <TrendChart views={site.trend} regs={site.regTrend} />
        </section>
      )}
    </>
  );
}

function TrafficTab({ site, loading }: { site: any; loading: boolean }) {
  if (loading) return <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>;
  if (!site) return null;
  return (
    <>
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Stat icon={<Eye className="h-4 w-4" />} label="Total views (30d)" value={site.totalViews} tone="primary" />
        <Stat icon={<Globe className="h-4 w-4" />} label="Unique visitors" value={site.uniqueVisitors} />
      </section>

      <section className="mt-6 card-constellation overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 p-4">
          <h3 className="font-display text-lg font-bold">Top pages</h3>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-border/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="col-span-8">Path</div>
          <div className="col-span-2 text-right">Views</div>
          <div className="col-span-2 text-right">Uniques</div>
        </div>
        {site.topPages.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No traffic yet.</div>
        )}
        {site.topPages.map((p: { path: string; views: number; uniques: number }) => (
          <div key={p.path} className="grid grid-cols-12 gap-3 border-b border-border/40 px-4 py-2 text-sm last:border-b-0">
            <div className="col-span-8 truncate font-mono text-xs">{p.path}</div>
            <div className="col-span-2 text-right">{p.views}</div>
            <div className="col-span-2 text-right text-muted-foreground">{p.uniques}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 card-constellation overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 p-4">
          <h3 className="font-display text-lg font-bold">Top referrers</h3>
        </div>
        {site.topReferrers.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No referrers logged.</div>
        )}
        {site.topReferrers.map((r: { host: string; count: number }) => (
          <div key={r.host} className="flex items-center justify-between border-b border-border/40 px-4 py-2 text-sm last:border-b-0">
            <div className="truncate font-mono text-xs">{r.host}</div>
            <div className="text-muted-foreground">{r.count}</div>
          </div>
        ))}
      </section>
    </>
  );
}

function EventsTab({ events, loading }: { events: any; loading: boolean }) {
  if (loading) return <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>;
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <TrendingUp className="h-4 w-4 text-primary" /> Per-event performance
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Approved events ranked by registrations, then click-throughs.</p>
      <div className="mt-4 card-constellation overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-12 gap-3 border-b border-border/60 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:grid">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Event</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Regs</div>
          <div className="col-span-2 text-right">Clicks</div>
        </div>
        {events?.topEvents?.length === 0 && <div className="p-6 text-sm text-muted-foreground">No approved events yet.</div>}
        {events?.topEvents?.map((e: any, i: number) => (
          <Link key={e.id} to="/admin/event/$id" params={{ id: e.id }}
            className="grid grid-cols-1 gap-2 border-b border-border/40 px-4 py-3 last:border-b-0 hover:bg-surface/40 sm:grid-cols-12 sm:items-center sm:gap-3">
            <div className="col-span-1 font-mono text-xs text-muted-foreground">#{i + 1}</div>
            <div className="col-span-6 min-w-0">
              <div className="truncate text-sm font-semibold">{e.title}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{e.city}</div>
            </div>
            <div className="col-span-2 font-mono text-xs text-muted-foreground">{e.starts_at ? new Date(e.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—"}</div>
            <div className="col-span-1 flex items-center gap-1 font-mono text-xs sm:justify-end"><Users className="h-3 w-3 text-primary" />{e.registrations}</div>
            <div className="col-span-2 flex items-center gap-1 font-mono text-xs sm:justify-end"><MousePointerClick className="h-3 w-3 text-secondary" />{e.clicks}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RegistrationsTab({ regs, loading }: { regs: any; loading: boolean }) {
  if (loading) return <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>;
  const rows = regs?.registrations ?? [];

  const exportCsv = () => {
    const out = [["name", "email", "event", "registered_at"]]
      .concat(rows.map((r: any) => [r.name, r.email, r.events?.title ?? "", r.created_at]));
    const csv = out.map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "all-registrations.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">All registrations ({rows.length})</h2>
        {rows.length > 0 && (
          <button onClick={exportCsv} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">
            Export CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="mt-3 card-constellation rounded-xl p-4 text-sm text-muted-foreground">No registrations yet.</div>
      ) : (
        <div className="mt-3 card-constellation overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                  <td className="px-3 py-2">
                    <Link to="/admin/event/$id" params={{ id: r.event_id }} className="text-primary hover:underline">
                      {r.events?.title ?? "(event)"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TrendChart({ views, regs }: {
  views: { day: string; views: number; uniques: number }[];
  regs: { day: string; count: number }[];
}) {
  const maxView = Math.max(1, ...views.map((v) => v.views));
  const maxReg = Math.max(1, ...regs.map((r) => r.count));
  return (
    <div className="mt-4 flex h-40 items-end gap-1">
      {views.map((v, i) => (
        <div key={v.day} className="group relative flex flex-1 flex-col items-center gap-0.5">
          <div className="flex w-full items-end gap-0.5" style={{ height: "100%" }}>
            <div className="flex-1 rounded-t bg-primary/70" style={{ height: `${(v.views / maxView) * 100}%` }} />
            <div className="flex-1 rounded-t bg-secondary/70" style={{ height: `${((regs[i]?.count ?? 0) / maxReg) * 100}%` }} />
          </div>
          <div className="absolute -top-8 hidden rounded bg-background/95 px-2 py-1 font-mono text-[10px] shadow group-hover:block">
            {v.day}: {v.views} views · {regs[i]?.count ?? 0} regs
          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({ icon, label, value, tone }: {
  icon: React.ReactNode; label: string; value: number | undefined;
  tone?: "primary" | "secondary" | "destructive";
}) {
  const cls = tone === "primary" ? "text-primary" : tone === "secondary" ? "text-secondary" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="card-constellation rounded-2xl p-5">
      <div className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest ${cls}`}>{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{(value ?? 0).toLocaleString()}</div>
    </div>
  );
}

// silence unused imports for icons we might use later
void CalendarDays;
