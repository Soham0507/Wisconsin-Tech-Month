import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getUserDetail } from "@/lib/admins.functions";
import { ArrowLeft, User as UserIcon, Shield } from "lucide-react";
import { WEEKS, displayCity } from "@/lib/wtm-data";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  head: () => ({
    meta: [
      { title: "User profile — WTM Admin" },
      { name: "description", content: "Admin view of a user's profile and submitted events." },
    ],
  }),
  component: UserDetailPage,
});

function UserDetailPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getUserDetail);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => fetchDetail({ data: { user_id: id } }),
    retry: false,
  });
  const forbidden = error instanceof Error && /forbidden/i.test(error.message);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link to="/admin/admins" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Site access
        </Link>

        {forbidden && <div className="mt-6 card-constellation rounded-2xl p-8"><h1 className="font-display text-xl font-bold">Not authorized</h1></div>}
        {isLoading && <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>}

        {data && (
          <>
            <div className="mt-4 card-constellation rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><UserIcon className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-bold">{data.user.name ?? "(no name)"}</h1>
                  <div className="text-sm text-muted-foreground">{data.user.email ?? "(no email)"}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.user.access.map((a) => (
                  <span key={a} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${a === "admin" ? "border-primary/40 bg-primary/10 text-primary" : "border-secondary/40 bg-secondary/10 text-secondary"}`}>
                    {a === "admin" && <Shield className="h-3 w-3" />}
                    {a}
                  </span>
                ))}
                {data.user.joined_at && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Joined {new Date(data.user.joined_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <section className="mt-6">
              <h2 className="font-display text-xl font-bold">Submitted events ({data.events.length})</h2>
              <div className="mt-3 space-y-2">
                {data.events.length === 0 && (
                  <div className="card-constellation rounded-xl p-4 text-sm text-muted-foreground">No events submitted.</div>
                )}
                {data.events.map((e) => {
                  const w = WEEKS[e.week as keyof typeof WEEKS];
                  return (
                    <Link
                      key={e.id}
                      to="/admin/event/$id"
                      params={{ id: e.id }}
                      className="card-constellation flex items-center justify-between gap-3 rounded-xl p-4 hover:border-primary/60"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip status={e.status} />
                          {w && <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest" style={{ borderColor: w.color, color: w.color }}>{w.name}</span>}
                        </div>
                        <div className="mt-1 truncate font-semibold">{e.title}</div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {displayCity(e.city)} · submitted {new Date(e.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "approved" ? "border-primary/40 bg-primary/10 text-primary" :
    status === "pending" ? "border-secondary/40 bg-secondary/10 text-secondary" :
    "border-destructive/40 bg-destructive/10 text-destructive";
  return (<span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cls}`}>{status}</span>);
}
