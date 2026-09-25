import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Header, Footer } from "@/components/wtm/Chrome";
import { StarMap } from "@/components/wtm/StarMap";
import { EventCard } from "@/components/wtm/EventCard";
import { REGIONS, FORMATS, TOPICS, WEEKS, buildMapData, type EventFormat, type WeekKey, type WTMEvent } from "@/lib/wtm-data";
import { listApprovedEvents } from "@/lib/events.functions";
import { dbEventToWtm } from "@/lib/db-events";
import { useMemo, useState } from "react";


export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Statewide Map — WTM 2026" },
      { name: "description", content: "Explore Wisconsin Tech Month events across 8 regions. Filter by week, format, topic, and audience." },
      { property: "og:title", content: "WTM 2026 Statewide Map" },
      { property: "og:description", content: "Wisconsin rendered as a star map. Regions are constellations, events are stars." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [region, setRegion] = useState<string | null>(null);
  const [week, setWeek] = useState<WeekKey | null>(null);
  const [format, setFormat] = useState<EventFormat | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  const fetchApproved = useServerFn(listApprovedEvents);
  const dbQuery = useQuery({
    queryKey: ["approved-events"],
    queryFn: () => fetchApproved(),
    staleTime: 30_000,
  });

  const ALL_EVENTS = useMemo<WTMEvent[]>(
    () => (dbQuery.data?.events ?? []).map(dbEventToWtm),
    [dbQuery.data],
  );

  const { counts, eventsByRegion, cityNodes } = useMemo(
    () => buildMapData(ALL_EVENTS.map((e) => ({ id: e.id, title: e.title, city: e.city, region: e.region ?? null }))),
    [ALL_EVENTS],
  );

  const t = useMemo(() => {
    const lit = REGIONS.filter((r) => counts[r.id]).length;
    const counties = REGIONS.filter((r) => counts[r.id]).reduce((s, r) => s + r.counties, 0);
    return { events: ALL_EVENTS.length, regionsLit: lit, counties };
  }, [ALL_EVENTS, counts]);

  const filtered = useMemo(() => ALL_EVENTS.filter((e) =>
    (!region || e.region === region) &&
    (!week || e.week === week) &&
    (!format || e.format === format) &&
    (!topic || e.topics.includes(topic))
  ), [ALL_EVENTS, region, week, format, topic]);

  const activeRegion = REGIONS.find(r => r.id === region);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary">Statewide map</div>
            <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">Wisconsin, lit up.</h1>
          </div>
          <div className="flex gap-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span><span className="text-primary text-2xl font-display font-bold">{t.events}</span> events</span>
            <span><span className="text-primary text-2xl font-display font-bold">{t.regionsLit}</span> regions lit</span>
            <span><span className="text-primary text-2xl font-display font-bold">{t.counties}</span> counties</span>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Map — desktop. Mobile shows region chips below. */}
          <div className="hidden lg:block">
            <div className="card-constellation overflow-hidden rounded-3xl p-2">
              <StarMap selected={region} onSelect={setRegion} counts={counts} eventsByRegion={eventsByRegion} cityNodes={cityNodes} />
            </div>
          </div>


          <div>
            {/* Mobile region chips */}
            <div className="lg:hidden">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Regions</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {REGIONS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRegion(region === r.id ? null : r.id)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                      region === r.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/60"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 space-y-4 lg:mt-0">
              <FilterRow label="Week">
                <Chip active={!week} onClick={() => setWeek(null)}>All weeks</Chip>
                {(Object.entries(WEEKS) as [WeekKey, typeof WEEKS["w1"]][]).map(([k, w]) => (
                  <Chip key={k} active={week === k} onClick={() => setWeek(week === k ? null : k)} color={w.color}>
                    {w.name}
                  </Chip>
                ))}
              </FilterRow>
              <FilterRow label="Format">
                <Chip active={!format} onClick={() => setFormat(null)}>Any</Chip>
                {FORMATS.map(f => (
                  <Chip key={f.id} active={format === f.id} onClick={() => setFormat(format === f.id ? null : f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </FilterRow>
              <FilterRow label="Topic">
                <Chip active={!topic} onClick={() => setTopic(null)}>All topics</Chip>
                {TOPICS.slice(0, 8).map(t => (
                  <Chip key={t} active={topic === t} onClick={() => setTopic(topic === t ? null : t)}>
                    {t}
                  </Chip>
                ))}
              </FilterRow>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "event" : "events"} {activeRegion ? `in ${activeRegion.name}` : "statewide"}
              </div>
              {(region || week || format || topic) && (
                <button onClick={() => { setRegion(null); setWeek(null); setFormat(null); setTopic(null); }} className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {filtered.length === 0 ? (
                <EmptyState region={activeRegion?.name} />
              ) : (
                filtered.map(e => <EventCard key={e.id} event={e} />)
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground/80 hover:border-primary/40 hover:text-primary"
      }`}
      style={active && color ? { borderColor: color, color, background: `color-mix(in oklab, ${color} 15%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}

function EmptyState({ region }: { region?: string }) {
  return (
    <div className="card-constellation rounded-2xl p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-secondary/15 ring-1 ring-secondary/30" />
      <div className="mt-4 font-display text-xl font-bold">No events match these filters yet.</div>
      <p className="mt-2 text-sm text-muted-foreground">
        {region ? `${region} doesn't have an event matching this view.` : "Try widening your filters, or help bring an event here."}
      </p>
      <Link to="/host" className="mt-5 inline-block rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:shadow-glow-purple">
        Host an event {region ? `in ${region}` : "in Wisconsin"}
      </Link>
    </div>
  );
}
