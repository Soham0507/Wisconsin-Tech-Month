import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";

type Search = { token?: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Unsubscribe · Wisconsin Tech Month" },
      { name: "description", content: "Manage your email preferences for Wisconsin Tech Month." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Status = "loading" | "confirm" | "already" | "invalid" | "submitting" | "done" | "error";

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.ok && body?.email) {
          setEmail(body.email);
          setStatus(body.already_unsubscribed ? "already" : "confirm");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function onConfirm() {
    if (!token) return;
    setStatus("submitting");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setStatus(r.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card text-card-foreground p-8 shadow-xl">
        <div className="text-sm font-black tracking-wide text-primary mb-3">
          WISCONSIN TECH MONTH 2026
        </div>
        {status === "loading" && <p className="text-muted-foreground">Checking your link…</p>}
        {status === "invalid" && (
          <>
            <h1 className="text-xl font-semibold mb-2">Link not valid</h1>
            <p className="text-muted-foreground">
              This unsubscribe link is invalid or has expired.
            </p>
          </>
        )}
        {status === "already" && (
          <>
            <h1 className="text-xl font-semibold mb-2">You're already unsubscribed</h1>
            <p className="text-muted-foreground">
              {email ?? "This address"} has been removed from our email list.
            </p>
          </>
        )}
        {(status === "confirm" || status === "submitting") && (
          <>
            <h1 className="text-xl font-semibold mb-2">Unsubscribe</h1>
            <p className="text-muted-foreground mb-6">
              Stop sending Wisconsin Tech Month emails to{" "}
              <strong className="text-foreground">{email}</strong>?
            </p>
            <button
              onClick={onConfirm}
              disabled={status === "submitting"}
              className="w-full rounded-lg bg-primary text-primary-foreground font-medium py-2.5 hover:opacity-90 disabled:opacity-60"
            >
              {status === "submitting" ? "Unsubscribing…" : "Confirm unsubscribe"}
            </button>
          </>
        )}
        {status === "done" && (
          <>
            <h1 className="text-xl font-semibold mb-2">You're unsubscribed</h1>
            <p className="text-muted-foreground">
              {email ?? "You"} will no longer receive Wisconsin Tech Month emails.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground">Please try the link from your email again.</p>
          </>
        )}
      </div>
    </div>
  );
}
