import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { EventCard } from "@/components/wtm/EventCard";
import { EVENTS as SEED_EVENTS, WEEKS, displayCity, type WTMEvent } from "@/lib/wtm-data";
import { EVENT_IMAGES } from "@/lib/event-images";

import { Calendar, MapPin, Tag, ArrowLeft, ExternalLink, CalendarPlus, Check, Edit3, Shield, Building2, Eye, BarChart3, MousePointerClick, Users } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getApprovedEvent, getEventForAdminPreview, getMyEventPreview, getMyEventAnalytics, listApprovedEvents } from "@/lib/events.functions";
import { registerForEvent, logEventClick } from "@/lib/registration.functions";
import { dbEventToWtm } from "@/lib/db-events";
import { useSession, useIsAdmin } from "@/hooks/use-session";
import { Turnstile } from "@/lib/turnstile";
import type { Database } from "@/integrations/supabase/types";


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deterministic formatters for local wall-clock starts_at strings. */
function formatDateLong(iso: string): string {
  const [datePart] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatTime12(iso: string): string {
  const timePart = iso.split("T")[1];
  const [hourStr, minuteStr] = timePart.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${ampm}`;
}


type EventRow = Database["public"]["Tables"]["events"]["Row"];

type LoaderData =
  | { source: "seed"; event: WTMEvent; row: null }
  | { source: "db"; event: WTMEvent; row: EventRow }
  | { source: "pending"; event: null; row: null; id: string };

export const Route = createFileRoute("/event/$id")({
  loader: async ({ params }) => {
    if (UUID_RE.test(params.id)) {
      const { event } = await getApprovedEvent({ data: { id: params.id } });
      if (event) return { source: "db", event: dbEventToWtm(event), row: event } satisfies LoaderData;
      // Not approved (pending/denied/missing) — let the component try an
      // admin-only preview fetch. Non-admins will see the not-found UI.
      return { source: "pending", event: null, row: null, id: params.id } satisfies LoaderData;
    }
    const seed = SEED_EVENTS.find((e) => e.id === params.id);
    if (!seed) throw notFound();
    return { source: "seed", event: seed, row: null } satisfies LoaderData;
  },
  head: ({ loaderData }) => {
    const img = loaderData?.event?.image;
    const isHttps = typeof img === "string" && /^https:\/\//.test(img);
    const title = loaderData?.event?.title;
    const desc = loaderData?.event?.description ?? "";
    return {
      meta: [
        { title: title ? `${title} — WTM 2026` : "Event — WTM 2026" },
        { name: "description", content: desc },
        { property: "og:title", content: title ?? "WTM 2026" },
        { property: "og:description", content: desc },
        ...(loaderData?.source === "pending" ? [{ name: "robots", content: "noindex" }] : []),
        ...(isHttps
          ? [
              { property: "og:image", content: img },
              { name: "twitter:image", content: img },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
      ],
    };
  },
  errorComponent: ({ error }) => (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-32 text-center">
        <h1 className="font-display text-3xl font-bold">Couldn't load this event</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/calendar" search={{}} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">View the calendar</Link>
      </main>
      <Footer />
    </>
  ),
  notFoundComponent: () => (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-32 text-center">
        <h1 className="font-display text-4xl font-bold">Event not found</h1>
        <p className="mt-3 text-muted-foreground">This event isn't on the WTM 2026 calendar.</p>
        <Link to="/calendar" search={{}} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">View the calendar</Link>
      </main>
      <Footer />
    </>
  ),
  component: EventPage,
});

function EventPage() {
  const loaderData = Route.useLoaderData();
  const { user, loading: sessionLoading } = useSession();
  const { isAdmin, loading: adminLoading } = useIsAdmin(user?.id);

  const isPreview = loaderData.source === "pending";
  const fetchAdminPreview = useServerFn(getEventForAdminPreview);
  const fetchOwnerPreview = useServerFn(getMyEventPreview);
  const previewId = isPreview ? loaderData.id : null;
  const {
    data: adminPreviewData,
    isLoading: adminPreviewLoading,
    error: adminPreviewError,
  } = useQuery({
    queryKey: ["event-admin-preview", previewId],
    queryFn: () => fetchAdminPreview({ data: { id: previewId! } }),
    enabled: !!previewId && isAdmin,
    retry: false,
  });
  const {
    data: ownerPreviewData,
    isLoading: ownerPreviewLoading,
    error: ownerPreviewError,
  } = useQuery({
    queryKey: ["event-owner-preview", previewId, user?.id],
    queryFn: () => fetchOwnerPreview({ data: { id: previewId! } }),
    enabled: !!previewId && !!user && !isAdmin,
    retry: false,
  });
  const previewData = adminPreviewData ?? ownerPreviewData;
  const previewLoading = adminPreviewLoading || ownerPreviewLoading;
  const previewError = adminPreviewError ?? ownerPreviewError;

  const [descOpen, setDescOpen] = useState(false);
  const logClick = useServerFn(logEventClick);

  // Live approved events, used to build the "similar events" section.
  const fetchApproved = useServerFn(listApprovedEvents);
  const approvedQuery = useQuery({
    queryKey: ["approved-events"],
    queryFn: () => fetchApproved(),
    staleTime: 30_000,
  });

  // Resolve the working event/row across the three sources.
  const event: WTMEvent | null = isPreview
    ? previewData?.event
      ? dbEventToWtm(previewData.event)
      : null
    : loaderData.event;
  const row: EventRow | null = isPreview
    ? (previewData?.event ?? null)
    : loaderData.row;

  // Only show the loading state while we're still resolving whether the
  // viewer is an admin OR while the admin preview query is in flight.
  // Once resolved (non-admin, unauthenticated, or query error), fall
  // through to the "not found" copy instead of spinning forever.
  const stillResolving =
    isPreview && (sessionLoading || adminLoading || ((isAdmin || (!!user && !isAdmin)) && previewLoading));

  if (!event) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-5 py-32 text-center">
          {stillResolving ? (
            <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading preview…</div>
          ) : (
            <>
              <h1 className="font-display text-4xl font-bold">Event not found</h1>
              <p className="mt-3 text-muted-foreground">
                {previewError && (isAdmin || !!user)
                  ? "We couldn't load this submission."
                  : "This event isn't on the WTM 2026 calendar."}
              </p>
              <Link to="/calendar" search={{}} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">View the calendar</Link>
            </>
          )}
        </main>
        <Footer />
      </>
    );
  }

  const week = WEEKS[event.week as keyof typeof WEEKS];
  const dateLong = formatDateLong(event.date);
  const timeStr = formatTime12(event.date);
  // Similar events come only from real, approved submissions — matched on
  // city first, then shared topics. Never seed/demo data.
  const sameCity = displayCity(event.city).toLowerCase();
  const eventTopics = new Set(event.topics ?? []);
  const related = (approvedQuery.data?.events ?? [])
    .map(dbEventToWtm)
    .filter((e) => e.id !== event.id)
    .map((e) => {
      const cityMatch = displayCity(e.city).toLowerCase() === sameCity;
      const topicMatches = (e.topics ?? []).filter((t) => eventTopics.has(t)).length;
      return { e, score: (cityMatch ? 10 : 0) + topicMatches, match: cityMatch || topicMatches > 0 };
    })
    .filter((x) => x.match)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.e);

  const isDbInternal = (loaderData.source === "db" || isPreview) && row?.path === "internal";
  const isDbExternal = (loaderData.source === "db" || isPreview) && row?.path === "external";

  const onExternalClick = () => {
    if (isPreview) return;
    if (isDbExternal && row) {
      logClick({ data: { eventId: row.id, referrer: typeof document !== "undefined" ? document.referrer : undefined } }).catch(() => {});
    }
  };

  const isLongDesc = (event.description?.length ?? 0) > 260;
  const heroImg = event.image ?? EVENT_IMAGES[event.id];
  const previewStatus = row?.status;
  const isOwner = !!user && !!row && row.organizer_id === user.id;
  const showOwnerAnalytics = isOwner && !!row;

  return (
    <>
      <Header />
      <main>
        {isPreview && (
          <div className="border-b border-secondary/40 bg-secondary/10">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-secondary">
                <Eye className="h-3 w-3" />
                {isAdmin ? "Admin preview" : "Preview"}{previewStatus ? ` — status: ${previewStatus}` : ""}. Not publicly visible.
              </div>
              {row && isAdmin && (
                <Link
                  to="/admin/queue"
                  search={{ highlight: row.id }}
                  className="rounded-full border border-secondary/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  Back to approval queue
                </Link>
              )}
              {row && !isAdmin && (
                <Link
                  to="/host/dashboard"
                  className="rounded-full border border-secondary/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  Back to dashboard
                </Link>
              )}
            </div>
          </div>
        )}
        {showOwnerAnalytics && <OwnerAnalyticsBanner eventId={row!.id} status={row!.status} />}
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60">
          {heroImg && (
            <>
              <img
                src={heroImg}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
            </>
          )}
          <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 md:py-24">
            <Link to="/calendar" search={{}} className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-3 w-3" /> Back to calendar
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${week.tagClass}`}>
                {week.name} · {week.theme}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight md:text-5xl">{event.title}</h1>

            {/* Host metadata */}
            <div className="mt-8 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-border bg-surface/60">
                {row?.host_logo_url ? (
                  <img src={row.host_logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary/70" />
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">by <span className="font-semibold text-foreground">{event.host}</span></div>
                <div className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {displayCity(event.city) || "Location TBA"} · {event.capacity ? `Capacity ${event.capacity}` : "Open capacity"}
                </div>
              </div>
            </div>

            {/* Date / format / location */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <div className="grid h-6 w-6 place-items-center rounded-full border border-border bg-surface/60">
                  <MapPin className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground">{event.format.replace("-", " ")}{event.venue ? ` · ${event.venue}` : ""}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="grid h-6 w-6 place-items-center rounded-full border border-border bg-surface/60">
                  <Calendar className="h-3 w-3 text-primary" />
                </div>
                <span className="text-foreground">{dateLong} · {timeStr}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            {event.description && (
              <div>
                <h2 className="font-display text-2xl font-bold">Overview</h2>
                <div className="mt-3 max-w-2xl">
                  <p className={`text-base text-muted-foreground ${isLongDesc && !descOpen ? "line-clamp-4" : ""}`}>
                    {event.description}
                  </p>
                  {isLongDesc && (
                    <button
                      type="button"
                      onClick={() => setDescOpen((v) => !v)}
                      className="mt-3 font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
                    >
                      {descOpen ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {event.topics.length > 0 && (
              <DetailRow icon={<Tag className="h-4 w-4 text-primary" />} label="Topics">
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {event.topics.map((t: string) => <span key={t} className="rounded-full border border-border bg-surface/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">{t}</span>)}
                </div>
              </DetailRow>
            )}
            {event.address && (
              <DetailRow icon={<MapPin className="h-4 w-4 text-primary" />} label="Address">
                <div className="text-sm">{event.address}</div>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
                  Open in Google Maps →
                </a>
              </DetailRow>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!isDbInternal && (
                <a
                  href={event.registrationUrl}
                  onClick={onExternalClick}
                  target={isDbExternal ? "_blank" : undefined}
                  rel={isDbExternal ? "noreferrer" : undefined}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow-teal"
                >
                  Register <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <a
                href={`/api/public/event/${event.id}/ics.ics`}
                download={`${event.id}.ics`}
                rel="external"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-5 py-3 text-sm font-semibold hover:border-primary/60"
              >
                <CalendarPlus className="h-4 w-4" /> Add to calendar
              </a>
              {isAdmin && (loaderData.source === "db" || isPreview) && row && (
                <>
                  <Link
                    to="/host/submit"
                    search={{ id: row.id }}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Edit3 className="h-4 w-4" /> Edit event
                  </Link>
                  <Link
                    to="/admin/event/$id"
                    params={{ id: row.id }}
                    className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-5 py-3 text-sm font-semibold text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Shield className="h-4 w-4" /> Admin view
                  </Link>
                </>
              )}
            </div>
          </div>


          
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {isDbInternal && row && <RegistrationForm event={row} />}
            {heroImg && (
              <div className="card-constellation h-fit overflow-hidden rounded-2xl">
                <img src={heroImg} alt={event.title} className="aspect-[4/3] w-full object-cover" />
              </div>
            )}
          </aside>
        </section>


        {/* Related */}
        {related.length > 0 && (
          <section className="mx-auto max-w-7xl border-t border-border/60 px-5 py-16">
            <div className="font-mono text-xs uppercase tracking-widest text-primary">Explore similar events</div>
            <h2 className="mt-2 font-display text-3xl font-bold">More from {displayCity(event.city)} & similar topics</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {related.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

      </main>
      <Footer />
    </>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="card-constellation rounded-2xl p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function RegistrationForm({ event }: { event: EventRow }) {
  const register = useServerFn(registerForEvent);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) { setErr("Please complete the captcha before registering."); return; }
    setStatus("submitting"); setErr(null);
    try {
      await register({ data: { eventId: event.id, name, email, captchaToken } });
      setStatus("success");
    } catch (e2) {
      setStatus("error");
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
      setCaptchaToken(null);
    }
  };



  if (status === "success") {
    return (
      <div id="register" className="card-constellation rounded-2xl p-6">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
          <Check className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-display text-xl font-bold">You're registered.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          A confirmation email with a calendar file is on its way to <span className="text-primary">{email}</span>.
        </p>
        <a
          href={`/api/public/event/${event.id}/ics.ics`}
          download={`${event.id}.ics`}
          rel="external"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <CalendarPlus className="h-3 w-3" /> Add to calendar now
        </a>
      </div>
    );
  }

  return (
    <form id="register" onSubmit={submit} className="card-constellation rounded-2xl p-6">
      <div className="font-mono text-[11px] uppercase tracking-widest text-primary">Register</div>
      <h3 className="mt-1 font-display text-xl font-bold">Save your spot</h3>
      <p className="mt-1 text-xs text-muted-foreground">You'll get a confirmation email with a calendar invite.</p>

      <label className="mt-4 block">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Name</span>
        <input required maxLength={120} className="reg-field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="mt-3 block">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</span>
        <input required type="email" maxLength={255} className="reg-field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <Turnstile
        onVerify={setCaptchaToken}
        onExpire={() => setCaptchaToken(null)}
        className="mt-4"
      />

      {err && <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}

      <button disabled={status === "submitting" || !captchaToken} type="submit"
        className="mt-5 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal disabled:opacity-60">
        {status === "submitting" ? "Registering…" : "Register"}
      </button>

      <style>{`
        .reg-field { width: 100%; border-radius: 10px; border: 1px solid oklch(1 0 0 / 0.14); background: oklch(0.16 0.04 265 / 0.6); padding: 0.55rem 0.75rem; font-size: 0.875rem; color: var(--color-foreground); }
        .reg-field:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
      `}</style>
    </form>
  );
}


function OwnerAnalyticsBanner({ eventId, status }: { eventId: string; status: string }) {
  const fetchAnalytics = useServerFn(getMyEventAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["my-event-analytics", eventId],
    queryFn: () => fetchAnalytics({ data: { eventId } }),
    enabled: status === "approved",
  });
  return (
    <div className="border-b border-primary/30 bg-primary/5">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary">
          <BarChart3 className="h-3 w-3" /> Your event — live analytics
        </div>
        {status !== "approved" ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Stats will appear once approved.
          </div>
        ) : isLoading ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Eye className="h-3 w-3 text-primary" /> {data?.views ?? 0} views</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3 text-primary" /> {data?.registrations ?? 0} regs</span>
            <span className="inline-flex items-center gap-1.5"><MousePointerClick className="h-3 w-3 text-primary" /> {data?.clicks ?? 0} clicks</span>
            <Link to="/host/dashboard" className="rounded-full border border-primary/40 px-3 py-1 text-primary hover:bg-primary hover:text-primary-foreground">
              Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
