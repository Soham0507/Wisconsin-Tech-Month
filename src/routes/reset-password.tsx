import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Wisconsin Tech Month 2026" },
      { name: "description", content: "Set a new password for your Wisconsin Tech Month host account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (params.get("type") !== "recovery") {
      setErr("This password reset link is invalid or has expired.");
    } else {
      setReady(true);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setInfo(null);
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Signing you in...");
      setTimeout(() => navigate({ to: "/auth" }), 1500);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
        <div className="card-constellation w-full max-w-md rounded-3xl p-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            Sign in
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a new password for your Wisconsin Tech Month host account.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              required
              minLength={6}
              type="password"
              placeholder="New password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              disabled={!ready || busy}
            />
            <input
              required
              minLength={6}
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="field"
              disabled={!ready || busy}
            />
            {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
            {info && <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{info}</div>}
            <button
              disabled={!ready || busy}
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal disabled:opacity-60"
            >
              {busy ? "…" : "Update password"}
            </button>
          </form>

          <div className="mt-6 border-t border-border/50 pt-4 text-center">
            <Link to="/auth" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <style>{`
        .field { width: 100%; border-radius: 10px; border: 1px solid oklch(1 0 0 / 0.14); background: oklch(0.16 0.04 265 / 0.6); padding: 0.6rem 0.85rem; font-size: 0.875rem; color: var(--color-foreground); }
        .field:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
      `}</style>
    </>
  );
}
