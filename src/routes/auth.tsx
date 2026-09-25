import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Turnstile } from "@/lib/turnstile";
import { verifyCaptcha } from "@/lib/turnstile.functions";


const searchSchema = z.object({ redirect: z.string().optional() });

/** Only same-origin relative paths are honored as a post-sign-in return target. */
function safeReturnUrl(redirect?: string): string {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return window.location.origin + redirect;
  }
  return window.location.origin;
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Wisconsin Tech Month 2026" },
      { name: "description", content: "Sign in to host an event, manage RSVPs, and access your WTM host account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const verifyCaptchaFn = useServerFn(verifyCaptcha);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: search.redirect ?? "/host/dashboard" });
    });
  }, [navigate, search.redirect]);


  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) { setErr("Please complete the captcha before continuing."); return; }
    setBusy(true); setErr(null); setInfo(null);
    try {
      // Fail-closed: server-verify Turnstile before touching auth.
      await verifyCaptchaFn({ data: { token: captchaToken } });
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: safeReturnUrl(search.redirect),
            data: { name },
          },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: search.redirect ?? "/host/dashboard" });
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
      setCaptchaToken(null);
    } finally {
      setBusy(false);
    }
  };


  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErr("Please enter your email address."); return; }
    setBusy(true); setErr(null); setInfo(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setInfo("Check your email for the password reset link.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true); setErr(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: safeReturnUrl(search.redirect),
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: search.redirect ?? "/host/dashboard" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
        <div className="card-constellation w-full max-w-md rounded-3xl p-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">
            {mode === "forgot" ? "Forgot password" : mode === "signin" ? "Sign in" : "Join WTM 2026"}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {mode === "forgot"
              ? "Reset your password"
              : mode === "signin"
              ? "WTM Host Account"
              : "Create a host account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and we'll send you a reset link."
              : "Host and manage events for Wisconsin Tech Month."}
          </p>

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onGoogle}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface/60 px-4 py-2.5 text-sm font-semibold hover:border-primary/60 disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
            </>
          )}

          <form onSubmit={mode === "forgot" ? onForgot : onEmail} className="space-y-3">
            {mode === "signup" && (
              <input required maxLength={120} placeholder="Your name" value={name}
                onChange={(e) => setName(e.target.value)}
                className="field" />
            )}
            <input required type="email" placeholder="you@company.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="field" />
            {mode !== "forgot" && (
              <>
                <input required minLength={6} type="password" placeholder="Password (min 6 chars)" value={password}
                  onChange={(e) => setPassword(e.target.value)} className="field" />
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setErr(null); setInfo(null); }}
                    className="mt-2 block w-full text-right text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    Forgot your password?
                  </button>
                )}
              </>
            )}
            {mode !== "forgot" && (
              <Turnstile
                key={mode}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                className="pt-1"
              />
            )}
            {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
            {info && <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{info}</div>}
            <button
              disabled={busy || (mode !== "forgot" && !captchaToken)}
              type="submit"
              className="w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal disabled:opacity-60"
            >
              {busy ? "…" : mode === "forgot" ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>


          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => { setMode("signin"); setErr(null); setInfo(null); }}
              className="mt-5 w-full font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              Back to sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); setInfo(null); }}
              className="mt-5 w-full font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          )}

          <div className="mt-6 border-t border-border/50 pt-4 text-center">
            <Link to="/calendar" search={{}} className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
              ← Back to events
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.5 2.9-2.2 5.4-4.7 7.1l7.5 5.8c4.4-4.1 7-10.2 7-17.2z"/>
      <path fill="#FBBC05" d="M10.5 28.6a14.4 14.4 0 0 1 0-9.2l-7.9-6.1a24 24 0 0 0 0 21.4l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}
