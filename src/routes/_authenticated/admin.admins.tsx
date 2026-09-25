import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdmins, grantAdminByEmail, revokeAdmin, cancelAdminInvite, listSiteUsers,
} from "@/lib/admins.functions";
import { Shield, UserPlus, X, Clock, Users, Search, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  head: () => ({
    meta: [
      { title: "Manage site access — WTM 2026" },
      { name: "description", content: "Directory of admins and hosts. Grant admin access, revoke, and view submitted events." },
    ],
  }),
  component: SiteAccessPage,
});

function SiteAccessPage() {
  const [tab, setTab] = useState<"users" | "admins">("users");

  const fetchAdmins = useServerFn(listAdmins);
  const { data: adminsData, error: adminsErr } = useQuery({
    queryKey: ["admins-manage"],
    queryFn: () => fetchAdmins(),
    retry: false,
  });
  const forbidden = adminsErr instanceof Error && /forbidden/i.test(adminsErr.message);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
          <Shield className="h-3.5 w-3.5" /> Admin
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Manage site access</h1>
        <p className="mt-1 text-muted-foreground">Everyone with access to the site — admins and hosts.</p>
        <div className="mt-3">
          <Link to="/admin" className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
            ← Back to admin dashboard
          </Link>
        </div>

        {forbidden ? (
          <div className="mt-8 card-constellation rounded-2xl p-8">
            <div className="font-display text-xl font-bold">Not authorized</div>
            <p className="mt-2 text-muted-foreground">You need the admin role to view this page.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 inline-flex rounded-full border border-border bg-surface/40 p-1 font-mono text-[11px] uppercase tracking-widest">
              <button onClick={() => setTab("users")} className={`rounded-full px-4 py-1.5 ${tab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Directory</button>
              <button onClick={() => setTab("admins")} className={`rounded-full px-4 py-1.5 ${tab === "admins" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Admins & invites</button>
            </div>

            {tab === "users" ? (
              <Directory />
            ) : (
              <div>
                <InviteForm />
                {adminsData && (
                  <>
                    <AdminsList admins={adminsData.admins} currentUserId={adminsData.currentUserId} />
                    {adminsData.invites.length > 0 && <InvitesList invites={adminsData.invites} />}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function Directory() {
  const [search, setSearch] = useState("");
  const fetchUsers = useServerFn(listSiteUsers);
  const { data, isLoading } = useQuery({
    queryKey: ["site-users", search],
    queryFn: () => fetchUsers({ data: { search } }),
    retry: false,
  });

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-2 focus-within:border-primary/60">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        {isLoading ? "Loading…" : `${data?.users.length ?? 0} users`}
      </div>

      <div className="mt-3 space-y-2">
        {(data?.users ?? []).map((u) => (
          <Link
            key={u.user_id}
            to="/admin/users/$id"
            params={{ id: u.user_id }}
            className="card-constellation flex items-center justify-between gap-3 rounded-xl p-4 hover:border-primary/60"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{u.name ?? u.email ?? "(unknown)"}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{u.email ?? "—"}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {u.access.map((a) => (
                <span key={a} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${a === "admin" ? "border-primary/40 bg-primary/10 text-primary" : "border-secondary/40 bg-secondary/10 text-secondary"}`}>
                  {a === "admin" && <Shield className="h-3 w-3" />}
                  {a}
                </span>
              ))}
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {u.events_count} evt
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
        {!isLoading && (data?.users.length ?? 0) === 0 && (
          <div className="card-constellation rounded-xl p-4 text-center text-sm text-muted-foreground">No users match.</div>
        )}
      </div>
    </div>
  );
}

function InviteForm() {
  const qc = useQueryClient();
  const grant = useServerFn(grantAdminByEmail);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const res = await grant({ data: { email: email.trim() } });
      setMsg({
        kind: "ok",
        text: res.status === "granted"
          ? `${res.email} is now an admin. We emailed them a heads-up.`
          : `We sent ${res.email} an invite email to create their login. They'll become admin as soon as they sign up.`,
      });
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admins-manage"] });
      qc.invalidateQueries({ queryKey: ["site-users"] });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 card-constellation rounded-2xl p-6">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary">
        <UserPlus className="h-3.5 w-3.5" /> Grant admin
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Admins are added manually. New admins receive an email invite to create their login; existing users get a notification.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          className="flex-1 rounded-full border border-border bg-background/40 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground hover:shadow-glow-teal disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send invite"}
        </button>
      </div>
      {msg && (
        <div className={`mt-3 rounded-md border p-2 text-sm ${
          msg.kind === "ok"
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-destructive/40 bg-destructive/10 text-destructive"
        }`}>{msg.text}</div>
      )}
    </form>
  );
}

function AdminsList({ admins, currentUserId }: {
  admins: { user_id: string; email: string | null; granted_at: string }[];
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const revoke = useServerFn(revokeAdmin);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const doRevoke = async (user_id: string, email: string | null) => {
    if (!confirm(`Revoke admin access from ${email ?? user_id}?`)) return;
    setBusyId(user_id); setErr(null);
    try {
      await revoke({ data: { user_id } });
      qc.invalidateQueries({ queryKey: ["admins-manage"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusyId(null); }
  };

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl font-bold">Current admins ({admins.length})</h2>
      <div className="mt-3 space-y-2">
        {admins.map((a) => (
          <div key={a.user_id} className="card-constellation flex items-center justify-between gap-3 rounded-xl p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{a.email ?? "(unknown email)"}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Granted {new Date(a.granted_at).toLocaleDateString()}
                {a.user_id === currentUserId && <span className="ml-2 text-primary">— you</span>}
              </div>
            </div>
            {a.user_id !== currentUserId && (
              <button
                onClick={() => doRevoke(a.user_id, a.email)}
                disabled={busyId === a.user_id}
                className="inline-flex items-center gap-1 rounded-full border border-destructive/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <X className="h-3 w-3" /> Revoke
              </button>
            )}
          </div>
        ))}
      </div>
      {err && <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">{err}</div>}
    </section>
  );
}

function InvitesList({ invites }: { invites: { email: string; created_at: string }[] }) {
  const qc = useQueryClient();
  const cancel = useServerFn(cancelAdminInvite);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const doCancel = async (email: string) => {
    if (!confirm(`Cancel the pending admin invite for ${email}?`)) return;
    setBusyEmail(email);
    try {
      await cancel({ data: { email } });
      qc.invalidateQueries({ queryKey: ["admins-manage"] });
    } finally { setBusyEmail(null); }
  };

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <Clock className="h-4 w-4 text-secondary" /> Pending invites ({invites.length})
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        These emails will become admin automatically when they sign up.
      </p>
      <div className="mt-3 space-y-2">
        {invites.map((i) => (
          <div key={i.email} className="card-constellation flex items-center justify-between gap-3 rounded-xl p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{i.email}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Invited {new Date(i.created_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => doCancel(i.email)}
              disabled={busyEmail === i.email}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
