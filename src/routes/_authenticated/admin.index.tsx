import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminAnalytics } from "@/lib/events.functions";
import { WEEKS, displayCity } from "@/lib/wtm-data";
import {
  Shield, Inbox, CheckCircle2, XCircle, CalendarDays, MousePointerClick,
  Users, ClipboardList, BarChart3, TrendingUp, ArrowRight, Clock, LineChart,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — WTM 2026" },
      { name: "description", content: "Approve submissions, manage the WTM calendar, and review event analytics." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchStats = useServerFn(getAdminAnalytics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => fetchStats(),
    retry: false,
  });

  const forbidden = error instanceof Error && /forbidden/i.test(error.message);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
          <Shield className="h-3.5 w-3.5" /> Admin
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Admin dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Approve submissions, manage the calendar, and review analytics across Wisconsin Tech Month.
        </p>

        {forbidden ? (
          <div className="mt-8 card-constellation rounded-2xl p-8">
            <div className="font-display text-xl font-bold">Not authorized</div>
            <p className="mt-2 text-muted-foreground">You need the admin role to view this page.</p>
          </div>
        ) : (
          <>
            {/* Quick actions */}
            <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/queue"
                className="card-constellation group flex items-start justify-between gap-3 rounded-2xl p-5 transition-all hover:border-primary/60 hover:shadow-glow-teal"
              >
                <QuickActionCard
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Approval queue"
                  desc="Review, approve, or deny event submissions."
                  badge={data?.totals.pending ? `${data.totals.pending} pending` : undefined}
                />
              </Link>
              <Link
                to="/admin/calendar"
                className="card-constellation group flex items-start justify-between gap-3 rounded-2xl p-5 transition-all hover:border-primary/60 hover:shadow-glow-teal"
              >
                <QuickActionCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Manage calendar"
                  desc="Edit, unpublish, and view per-event analytics."
                />
              </Link>
              <Link
                to="/admin/admins"
                className="card-constellation group flex items-start justify-between gap-3 rounded-2xl p-5 transition-all hover:border-primary/60 hover:shadow-glow-teal"
              >
                <QuickActionCard
                  icon={<Users className="h-5 w-5" />}
                  title="Manage site access"
                  desc="Directory of admins and hosts. Grant access."
                />
              </Link>

              <Link
                to="/admin/analytics"
                className="card-constellation group flex items-start justify-between gap-3 rounded-2xl p-5 transition-all hover:border-primary/60 hover:shadow-glow-teal"
              >
                <QuickActionCard
                  icon={<LineChart className="h-5 w-5" />}
                  title="View analytics"
                  desc="Totals, registrations, and per-event performance."
                />
              </Link>
            </section>


            {/* Stat cards */}
            <section className="mt-8">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <BarChart3 className="h-4 w-4 text-primary" /> Overview
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Stat icon={<Inbox className="h-4 w-4" />} label="EVENTS PENDING REVIEW" value={data?.totals.pending} tone="secondary" loading={isLoading} />
                <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="APPROVED/LIVE EVENTS" value={data?.totals.approved} tone="primary" loading={isLoading} />
                <Stat icon={<XCircle className="h-4 w-4" />} label="Denied" value={data?.totals.denied} tone="destructive" loading={isLoading} />
              </div>
            </section>

            {/* Two columns: week/region & top events */}
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="card-constellation rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold">Approved events (by week)</h3>
                <div className="mt-4 space-y-3">
                  {(["w1", "w2", "w3", "w4"] as const).map((wk) => {
                    const w = WEEKS[wk];
                    const count = data?.weekCounts[wk] ?? 0;
                    const max = Math.max(1, ...Object.values(data?.weekCounts ?? { x: 1 }));
                    return (
                      <div key={wk}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} />
                            {w.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">{count}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border/40">
                          <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: w.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <h3 className="mt-6 font-display text-lg font-bold">Approved by city</h3>
                <div className="mt-3 space-y-2">
                  {Object.entries(data?.cityCounts ?? {}).length === 0 && (
                    <div className="text-sm text-muted-foreground">No approved events yet.</div>
                  )}
                  {Object.entries(data?.cityCounts ?? {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([city, count]) => (
                      <div key={city} className="flex items-center justify-between text-sm">
                        <span>{city}</span>
                        <span className="font-mono text-xs text-muted-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="card-constellation rounded-2xl p-6">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                  <TrendingUp className="h-4 w-4 text-primary" /> Top events
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">By registrations, then click-throughs.</p>
                <div className="mt-4 space-y-2">
                  {(data?.topEvents ?? []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No approved events yet.</div>
                  )}
                  {data?.topEvents.map((e, i) => (
                    <Link
                      key={e.id}
                      to="/event/$id"
                      params={{ id: e.id }}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/30 p-3 hover:border-primary/50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          <span className="mr-2 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                          {e.title}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {displayCity(e.city)}{e.starts_at ? ` · ${new Date(e.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3 text-primary" />{e.registrations}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3 text-secondary" />{e.clicks}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent submissions */}
            <section className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                  <Clock className="h-4 w-4 text-secondary" /> Recent submissions
                </h2>
                <Link to="/admin/queue" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
                  Open queue <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {(data?.recentPending ?? []).length === 0 && (
                  <div className="card-constellation rounded-xl p-4 text-sm text-muted-foreground">
                    No pending submissions. You're all caught up.
                  </div>
                )}
                {data?.recentPending.map((e) => (
                  <div key={e.id} className="card-constellation flex items-center justify-between gap-3 rounded-xl p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{e.title}</div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {e.host_org} · {displayCity(e.city)} · submitted {new Date(e.created_at as string).toLocaleDateString()}
                      </div>
                    </div>
                    <Link
                      to="/admin/queue"
                      search={{ highlight: e.id }}
                      className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20"
                    >
                      Review
                    </Link>

                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function QuickActionCard({
  icon, title, desc, badge,
}: { icon: React.ReactNode; title: string; desc: string; badge?: string }) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 text-primary">{icon}<span className="font-display text-lg font-bold text-foreground">{title}</span></div>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        {badge && (
          <span className="mt-2 inline-block rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-secondary">
            {badge}
          </span>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </>
  );
}


function Stat({
  icon, label, value, tone, loading,
}: { icon: React.ReactNode; label: string; value: number | undefined; tone?: "primary" | "secondary" | "destructive"; loading?: boolean }) {
  const toneCls =
    tone === "primary" ? "text-primary" :
    tone === "secondary" ? "text-secondary" :
    tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="card-constellation rounded-2xl p-5">
      <div className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest ${toneCls}`}>
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">
        {loading ? <span className="inline-block h-8 w-14 animate-pulse rounded bg-surface/60" /> : (value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}
