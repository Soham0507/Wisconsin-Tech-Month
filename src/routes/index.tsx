import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header, Footer } from "@/components/wtm/Chrome";
import { StarMap } from "@/components/wtm/StarMap";
import { EventCard } from "@/components/wtm/EventCard";
import { DestinationCard } from "@/components/wtm/DestinationCard";
import { WEEKS, buildMapData } from "@/lib/wtm-data";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { listApprovedEvents } from "@/lib/events.functions";
import { dbEventToWtm } from "@/lib/db-events";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import weekMkeImgAsset from "@/assets/week-mke.png.asset.json";
import weekDevImgAsset from "@/assets/week-dev.png.asset.json";
import weekWitImgAsset from "@/assets/week-wit.png.asset.json";
import weekMidwestImgAsset from "@/assets/week-midwest.png.asset.json";
import creamCityCyberLogo from "@/assets/cream-city-cyber-logo.png.asset.json";
import bizStartsLogo from "@/assets/bizstarts-logo.png.asset.json";
import regalRexnordLogo from "@/assets/regal-rexnord-logo.png.asset.json";
import directSupplyLogo from "@/assets/direct-supply-logo.png.asset.json";
import WisciFestLogo from "@/assets/wiscifest-logo.png.asset.json";
import marquetteLogo from "@/assets/marquette-logo.png.asset.json";

const WEEK_IMAGES: Record<string, string> = {
  w1: weekMkeImgAsset.url,
  w2: weekDevImgAsset.url,
  w3: weekWitImgAsset.url,
  w4: weekMidwestImgAsset.url,
};

const COMMUNITY_LOGOS = [
  { name: "Cream City Cyber", src: creamCityCyberLogo.url, size: "max-h-16" },
  { name: "BizStarts", src: bizStartsLogo.url, size: "max-h-14" },
  { name: "Regal Rexnord", src: regalRexnordLogo.url, size: "max-h-16" },
  { name: "Direct Supply", src: directSupplyLogo.url, size: "max-h-14" },
  { name: "Wisconsin Science Festival", src: WisciFestLogo.url, size: "max-h-20" },
  { name: "Marquette University", src: marquetteLogo.url, size: "logo-shadow-invert" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wisconsin Tech Month 2026 — Connected Constellations" },
      { name: "description", content: "A statewide month of tech every October. Explore events across Wisconsin's regions — startups, industry, community, talent." },
      { property: "og:title", content: "WTM 2026 — Connected Constellations" },
      { property: "og:description", content: "One ecosystem. Infinite possibilities. Explore the statewide map of WTM 2026." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [selected, setSelected] = useState<string | null>(null);

  const fetchApproved = useServerFn(listApprovedEvents);
  const dbQuery = useQuery({
    queryKey: ["approved-events"],
    queryFn: () => fetchApproved(),
    staleTime: 30_000,
  });
  const { counts, eventsByRegion, cityNodes } = useMemo(() => {
    const rows = (dbQuery.data?.events ?? []).map(dbEventToWtm);
    return buildMapData(rows.map((e) => ({ id: e.id, title: e.title, city: e.city, region: e.region ?? null })));
  }, [dbQuery.data]);

  const featured = useMemo(() => {
    const rows = dbQuery.data?.events ?? [];
    const flagged = rows.filter((r) => (r as { featured_home?: boolean }).featured_home);
    const source = flagged.length > 0 ? flagged : rows;
    return source
      .map(dbEventToWtm)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [dbQuery.data]);


  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            {Array.from({ length: 60 }, (_, i) => (
              <span
                key={i}
                className="twinkle absolute rounded-full bg-foreground"
                style={{
                  top: `${(i * 37) % 100}%`,
                  left: `${(i * 71) % 100}%`,
                  width: `${(i % 3) + 1}px`,
                  height: `${(i % 3) + 1}px`,
                  animationDelay: `${(i % 5) * 0.6}s`,
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-6 md:pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-star" /> OCTOBER 1-31, 2026
              </div>
              <h1 className="mt-6 font-display text-6xl font-extrabold leading-[0.95] tracking-tight md:text-7xl lg:text-[88px]">
                Connected through&nbsp;<br/>
                <span className="text-primary text-glow-teal">
                innovation.</span>
              </h1>
              <p className="mt-6 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {" "}Bringing together top leaders, founders, funders, and technologist across Wisconsin and the midwest.&nbsp;
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/calendar" search={{}} className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow-teal transition-transform hover:scale-[1.02]">
                  View Events
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/about" className="rounded-full border border-border bg-surface/40 px-6 py-3 text-sm font-semibold text-foreground hover:border-secondary hover:text-secondary">
                  Explore WTM
                </Link>
              </div>
            </div>

            <div className="relative">
              <StarMap selected={selected} onSelect={setSelected} counts={counts} eventsByRegion={eventsByRegion} cityNodes={cityNodes} />
            </div>
          </div>
        </section>

        {/* FOUR WEEKS */}
        <section id="weeks" className="relative border-t border-border/50 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-primary">WTM PROGRAMMING</div>
                <h2 className="mt-2 font-display text-4xl font-bold md:text-5xl">WTM 2026 lineup</h2>
              </div>
              <Link to="/about" className="hidden font-mono text-xs uppercase tracking-widest text-primary hover:underline md:block">
                EXPLORE WTM 2026 →
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {(Object.entries(WEEKS) as [keyof typeof WEEKS, typeof WEEKS["w1"]][]).map(([key, w]) => {
                const slug = key === "w1" ? "mke-tech-week" : key === "w2" ? "dev-week" : key === "w3" ? "women-in-tech-week" : "midwest-tech-week";
                return (
                  <DestinationCard
                    key={key}
                    imageUrl={WEEK_IMAGES[key]}
                    dates={w.dates}
                    name={w.name}
                    theme={w.theme}
                    href={`/week/${slug}`}
                    themeColor={w.color}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* FEATURED EVENTS */}
        <section className="border-t border-border/50 py-20">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs uppercase tracking-widest text-primary">WTM HIGHLIGHTS&nbsp;</div>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl md:text-5xl">Featured events</h2>
              </div>
              <Link to="/calendar" search={{}} className="shrink-0 whitespace-nowrap font-mono text-xs uppercase tracking-widest text-primary hover:underline text-right">
                ALL&nbsp;EVENTS →
              </Link>
            </div>
            {featured.length === 0 ? (
              <div className="mt-10 card-constellation rounded-3xl p-10 text-center md:p-14">
                <div className="font-mono text-[11px] uppercase tracking-widest text-primary">{"\n"}</div>
                <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">Updates coming soon</h3>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground whitespace-pre-line">
                  We're finalizing WTM 2026 programming. Interested in hosting an event for Wisconsin Tech Month?&nbsp;{"\n\n"}
                  <Link to="/host/submit" className="text-primary underline underline-offset-4 hover:text-primary/80">Submit your event</Link> by Sept. 15th.{"\n"}
                </p>
              </div>
            ) : (
              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {featured.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </div>
        </section>

        {/* DUAL CTA */}
        <section className="border-t border-border/50 py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 md:grid-cols-2">
            <CtaPanel
              eyebrow="For organizers"
              title="Want to host an event in your city?"
              body=""
              cta="SUBMIT AN EVENT&nbsp;"
              to="/host"
              accent="primary"
            />
            <CtaPanel
              eyebrow="For sponsors"
              title="Reach Wisconsin's tech ecosystem."
              body="
"
              cta="Become a sponsor"
              to="/sponsor"
              accent="secondary"
            />
          </div>

          <div className="mt-14">
            <h2 className="text-center text-base font-medium leading-snug tracking-tight md:text-xl">
              <span className="block text-muted-foreground">{"\n"}</span>
              <span className="mt-1 block font-semibold md:mt-1.5">Special Thank You to &nbsp;WTM 2026 Sponsors</span>
            </h2>
            <div className="mx-auto mt-6 mb-10 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
            <InfiniteSlider
              gap={56}
              speed={70}
              speedOnHover={25}
              reverse
              className="[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
            >
              {COMMUNITY_LOGOS.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.src}
                  alt={`${logo.name} logo`}
                  className={`pointer-events-none logo-shadow h-auto w-auto max-w-[220px] select-none object-contain ${logo.size}`}
                  loading="lazy"
                />
              ))}
            </InfiniteSlider>
            <div className="h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CtaPanel({ eyebrow, title, body, cta, to, accent }: { eyebrow: string; title: string; body: string; cta: string; to: string; accent: "primary" | "secondary" }) {
  const isPrimary = accent === "primary";
  return (
    <Link to={to} className="card-constellation group relative overflow-hidden rounded-3xl p-10 transition-all hover:border-foreground/20">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-40"
        style={{ background: isPrimary ? "oklch(0.82 0.13 185)" : "oklch(0.70 0.18 295)" }}
      />
      <div className={`font-mono text-xs uppercase tracking-widest ${isPrimary ? "text-primary" : "text-secondary"}`}>{eyebrow}</div>
      <h3 className="mt-3 font-display text-3xl font-bold md:text-4xl">{title}</h3>
      {body.trim() && <p className="mt-3 max-w-md font-subtext text-sm leading-relaxed text-muted-foreground">{body}</p>}
      <div className={`mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest ${isPrimary ? "text-primary" : "text-secondary"}`}>
        {cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}