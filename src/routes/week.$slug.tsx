import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header, Footer } from "@/components/wtm/Chrome";
import { EventCard } from "@/components/wtm/EventCard";
import { listApprovedEvents } from "@/lib/events.functions";
import { dbEventToWtm } from "@/lib/db-events";
import { WEEKS, type WeekKey } from "@/lib/wtm-data";
import { Star, Calendar, ArrowRight } from "lucide-react";
import weekMkeImgAsset from "@/assets/week-mke.png.asset.json";
import weekDevImgAsset from "@/assets/week-dev.png.asset.json";
import weekWitImgAsset from "@/assets/week-wit.png.asset.json";
import weekMidwestImgAsset from "@/assets/week-midwest.png.asset.json";

const SLUG_TO_WEEK: Record<string, WeekKey> = {
  "mke-tech-week": "w1",
  "dev-week": "w2",
  "women-in-tech-week": "w3",
  "midwest-tech-week": "w4",
};

const WEEK_IMAGE: Record<WeekKey, string> = {
  w1: weekMkeImgAsset.url,
  w2: weekDevImgAsset.url,
  w3: weekWitImgAsset.url,
  w4: weekMidwestImgAsset.url,
};

const WEEK_LEDE: Record<WeekKey, string> = {
  w1: "A week connecting Milwaukee's policy leaders, ecosystem builders, and advocates driving the region's tech future.",
  w2: "Hackathons, workshops, and the developer community coming together across Wisconsin.",
  w3: "Storytelling, networking, and trailblazers championing women in tech across the Midwest.",
  w4: "Regional collaboration across 12 Midwest states — one shared week of programming.",
};

export const Route = createFileRoute("/week/$slug")({
  beforeLoad: ({ params }) => {
    if (!SLUG_TO_WEEK[params.slug]) throw notFound();
  },
  head: ({ params }) => {
    const key = SLUG_TO_WEEK[params.slug];
    if (!key) return { meta: [{ title: "Week — Wisconsin Tech Month" }] };
    const w = WEEKS[key];
    const title = `${w.name} — Wisconsin Tech Month 2026`;
    const desc = `${w.name} · ${w.dates}. ${w.theme}. Browse featured and all events during this week of Wisconsin Tech Month.`;
    const image = `https://witechmonth.com${WEEK_IMAGE[key]}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: WeekPage,
});

function WeekPage() {
  const { slug } = Route.useParams();
  const weekKey = SLUG_TO_WEEK[slug];
  const week = WEEKS[weekKey];
  const heroImg = WEEK_IMAGE[weekKey];

  const fetchEvents = useServerFn(listApprovedEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["approved-events"],
    queryFn: () => fetchEvents(),
  });

  const events = (data?.events ?? [])
    .filter((e) => (e.week as WeekKey) === weekKey)
    .map(dbEventToWtm)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const featured = events.filter((e) => (data?.events.find((r) => r.id === e.id) as { featured?: boolean } | undefined)?.featured);
  const rest = events.filter((e) => !featured.includes(e));

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0">
            <img src={heroImg} alt="" className="h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
          </div>
          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
              style={{ borderColor: week.color, color: week.color }}
            >
              <Calendar className="h-3 w-3" /> {week.dates}
            </div>
            <h1 className="mt-5 font-display text-5xl font-bold leading-tight sm:text-6xl">
              {week.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{WEEK_LEDE[weekKey]}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/calendar"
                search={{}}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest text-primary-foreground hover:opacity-90"
              >
                Browse full calendar <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                to="/host/submit"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 font-mono text-[11px] uppercase tracking-widest hover:text-primary hover:border-primary/50"
              >
                Host an event
              </Link>
            </div>
          </div>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-primary" /> Featured
                </div>
                <h2 className="mt-2 font-display text-3xl font-bold">Don't miss this week</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}

        {/* All events */}
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-4">
          <h2 className="font-display text-2xl font-bold">
            All {week.name} events {events.length > 0 && <span className="text-muted-foreground">({events.length})</span>}
          </h2>
          {isLoading ? (
            <div className="mt-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">Loading…</div>
          ) : rest.length === 0 && featured.length === 0 ? (
            <div className="mt-6 card-constellation rounded-2xl p-8 text-center text-muted-foreground">
              No events published for {week.name} yet.{" "}
              <Link to="/host/submit" className="text-primary hover:underline">Host one</Link>.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
