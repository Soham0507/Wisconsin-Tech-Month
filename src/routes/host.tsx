import { createFileRoute, Link } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { useSession } from "@/hooks/use-session";
import { Megaphone, Users, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/host")({
  head: () => ({
    meta: [
      { title: "Host an event — WTM 2026" },
      { name: "description", content: "Host during Wisconsin Tech Month 2026 — reach Wisconsin's tech ecosystem of founders, engineers, and investors." },
      { property: "og:title", content: "Submit an event for WTM" },
      { property: "og:description", content: "Reach Wisconsin's tech ecosystem during Wisconsin Tech Month 2026." },
    ],
  }),
  component: HostPage,
});

const BENEFITS = [
  { icon: Megaphone, title: "Statewide promotion", desc: "Your event appears on the WTM calendar, map, and email digest reaching thousands of Wisconsin technologists." },
  { icon: Users, title: "Reach your audience", desc: "Wisconsin's technologists, companies, and investors actively look for events to attend." },
  { icon: BarChart3, title: "Event support", desc: "Get RSVP tracking, attendee data, and a branded WTM event page for your event." },
];

function HostPage() {
  const { user } = useSession();

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-24 pt-16">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-primary">BECOME A WTM HOST</div>
              <h1 className="mt-2 max-w-3xl font-display text-5xl font-extrabold leading-tight md:text-6xl">
                Submit an event for WTM
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Wisconsin Tech Month is built by organizations, techies, and thought leaders. {"\u00a0"}Submit{"\u00a0"}your meetup, workshop, or summit and reach Wisconsin's tech ecosystem.
              </p>
            </div>
            {user && (
              <Link
                to="/host/dashboard"
                className="mt-2 shrink-0 rounded-full border border-border bg-surface/40 px-6 py-3 text-sm font-semibold hover:border-primary"
              >
                Go to host account
              </Link>
            )}
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-surface/40 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-end gap-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              EVENTS ARE FREE TO HOST DURING WTM. SUBMISSIONS TAKE 2-3 DAYS TO REVIEW.{" "}
            </span>
            <Link
              to="/host/submit"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

