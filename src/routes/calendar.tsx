import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { EventCard } from "@/components/wtm/EventCard";
import { WEEKS, FORMATS, MIDWEST_CITIES, displayCity, type EventFormat, type WeekKey, type WTMEvent } from "@/lib/wtm-data";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApprovedEvents } from "@/lib/events.functions";
import { dbEventToWtm } from "@/lib/db-events";

export const Route = createFileRoute("/calendar")({
  validateSearch: (s: Record<string, unknown>): { city?: string } => ({
    city: typeof s.city === "string" ? s.city : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Calendar — WTM 2026" },
      { name: "description", content: "Plan your Wisconsin Tech Month. Search events by keyword and filter by week, format, and region." },
      { property: "og:title", content: "WTM 2026 Calendar" },
      { property: "og:description", content: "Search and filter events across Wisconsin for October 2026." },
    ],
  }),
  component: CalendarPage,
});

type SortKey = "date-asc" | "date-desc" | "capacity-desc" | "newest-added";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "date-asc", label: "Date (soonest)" },
  { id: "date-desc", label: "Date (latest)" },
  { id: "capacity-desc", label: "Capacity (largest)" },
  { id: "newest-added", label: "Newest added" },
];

function CalendarPage() {
  const navigate = useNavigate();
  const { city: cityParam } = Route.useSearch();
  const [week, setWeek] = useState<WeekKey | null>(null);
  const [format, setFormat] = useState<EventFormat | null>(null);
  const [region, setRegion] = useState<string | null>(cityParam ?? null);
  useEffect(() => { if (cityParam) setRegion(cityParam); }, [cityParam]);
  const [sort, setSort] = useState<SortKey>("date-asc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [openGroups, setOpenGroups] = useState({ week: true, format: true, region: true });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = (week ? 1 : 0) + (format ? 1 : 0) + (region ? 1 : 0);

  const matchesSearch = (e: WTMEvent, q: string) => {
    if (!q) return true;
    const haystack = [e.title, e.description, e.host, e.city, e.venue, ...e.topics, ...e.audience]
      .join(" ").toLowerCase();
    return haystack.includes(q);
  };

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

  // Events after Week + Format + Search, used to derive the City filter options dynamically.
  const preRegionFiltered = useMemo(() => {
    const q = submittedQuery.toLowerCase().trim();
    return ALL_EVENTS.filter((e) =>
      (!week || e.week === week) &&
      (!format || e.format === format) &&
      matchesSearch(e, q),
    );
  }, [ALL_EVENTS, week, format, submittedQuery]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    for (const e of preRegionFiltered) if (e.city) set.add(displayCity(e.city));
    return Array.from(set).sort();
  }, [preRegionFiltered]);

  // If the selected city has no results, silently clear it.
  useMemo(() => {
    if (region && !availableCities.includes(displayCity(region))) setRegion(null);
  }, [region, availableCities]);

  const filtered = useMemo(() => {
    const list = preRegionFiltered.filter((e) => !region || displayCity(e.city) === displayCity(region));
    const sorted = [...list];
    switch (sort) {
      case "date-desc":
        sorted.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case "capacity-desc":
        sorted.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));
        break;
      case "newest-added":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "date-asc":
      default:
        sorted.sort((a, b) => a.date.localeCompare(b.date));
    }
    return sorted;
  }, [preRegionFiltered, region, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchInput);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSubmittedQuery("");
  };

  const clearFilters = () => {
    setWeek(null);
    setFormat(null);
    setRegion(null);
  };

  const toggleGroup = (key: keyof typeof openGroups) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Autosuggest: match events (title/host/city/venue) and cities.
  type Suggestion =
    | { kind: "event"; id: string; title: string; sub: string }
    | { kind: "city"; label: string };

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = searchInput.trim().toLowerCase();
    if (q.length < 2) return [];
    const eventMatches: Suggestion[] = [];
    for (const e of ALL_EVENTS) {
      const hay = `${e.title} ${e.host} ${e.city ?? ""} ${e.venue ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        eventMatches.push({
          kind: "event",
          id: e.id,
          title: e.title,
          sub: [displayCity(e.city), WEEKS[e.week]?.name].filter(Boolean).join(" · "),
        });
      }
      if (eventMatches.length >= 6) break;
    }
    const eventCities = new Set(ALL_EVENTS.map((e) => e.city).filter(Boolean) as string[]);
    const cityPool = Array.from(new Set([...eventCities, ...MIDWEST_CITIES]));
    const cityMatches: Suggestion[] = cityPool
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ kind: "city", label: c }));
    return [...eventMatches, ...cityMatches];
  }, [searchInput, ALL_EVENTS]);

  useEffect(() => { setActiveIdx(-1); }, [searchInput]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const applySuggestion = (s: Suggestion) => {
    setSuggestOpen(false);
    if (s.kind === "event") {
      navigate({ to: "/event/$id", params: { id: s.id } });
    } else {
      setSearchInput(s.label);
      setSubmittedQuery(s.label);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      applySuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
    }
  };

  const SearchBar = (
    <form onSubmit={handleSearchSubmit} className="w-full" autoComplete="off">
      <div ref={searchWrapRef} className="relative">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-2 transition-colors focus-within:border-primary/60 focus-within:bg-surface/80 focus-within:ring-1 focus-within:ring-primary/40">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search events or topics"
            aria-label="Search events or cities"
            aria-autocomplete="list"
            aria-expanded={suggestOpen && suggestions.length > 0}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:shadow-glow-teal"
          >
            Search
          </button>
        </div>
        {suggestOpen && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-border bg-surface/95 py-1 shadow-xl backdrop-blur"
          >
            {suggestions.map((s, i) => (
              <li key={`${s.kind}-${s.kind === "event" ? s.id : s.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activeIdx === i}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${activeIdx === i ? "bg-primary/10" : "hover:bg-primary/5"}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[10px] uppercase ${s.kind === "event" ? "bg-primary/15 text-primary" : "bg-secondary/20 text-secondary"}`}>
                    {s.kind === "event" ? "EV" : "CT"}
                  </span>
                  {s.kind === "event" ? (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{s.title}</span>
                      {s.sub && <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.sub}</span>}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{s.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );

  const filterGroups = (
    <>
      <CollapsibleFilterGroup
        label="Week"
        isOpen={openGroups.week}
        onToggle={() => toggleGroup("week")}
        activeCount={week ? 1 : 0}
      >
        <Chip active={!week} onClick={() => setWeek(null)}>All</Chip>
        {(Object.entries(WEEKS) as [WeekKey, typeof WEEKS["w1"]][]).map(([k, w]) => (
          <Chip key={k} active={week === k} color={w.color} onClick={() => setWeek(week === k ? null : k)}>
            {w.name}
          </Chip>
        ))}
      </CollapsibleFilterGroup>
      <CollapsibleFilterGroup
        label="Format"
        isOpen={openGroups.format}
        onToggle={() => toggleGroup("format")}
        activeCount={format ? 1 : 0}
      >
        <Chip active={!format} onClick={() => setFormat(null)}>Any</Chip>
        {FORMATS.map((f) => (
          <Chip key={f.id} active={format === f.id} onClick={() => setFormat(format === f.id ? null : f.id)}>
            {f.label}
          </Chip>
        ))}
      </CollapsibleFilterGroup>
      <CollapsibleFilterGroup
        label="CITY"
        isOpen={openGroups.region}
        onToggle={() => toggleGroup("region")}
        activeCount={region ? 1 : 0}
      >
        <Chip active={!region} onClick={() => setRegion(null)}>ALL</Chip>
        {availableCities.length === 0 && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">No cities match</span>
        )}
        {availableCities.map((c) => (
          <Chip key={c} active={displayCity(region) === c} onClick={() => setRegion(displayCity(region) === c ? null : c)}>
            {c}
          </Chip>
        ))}
      </CollapsibleFilterGroup>
    </>
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-primary">OCTOBER 1-31, 2026</div>
            <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">WTM 2026 Events</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">Search and register for WTM events happening through October.</p>
          </div>
        </div>

        {/* Mobile/tablet search + filters panel */}
        <div className="mt-6 lg:hidden">
          <div className="card-constellation rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">{SearchBar}</div>
            </div>
            <button
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">FILTER</span>
                {activeFilterCount > 0 && (
                  <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronIcon className={`h-4 w-4 text-muted-foreground transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileFiltersOpen && (
              <div className="mt-3 border-t border-border/60 pt-3">
                {filterGroups}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 w-full rounded-full border border-border py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Desktop left filter panel */}
          <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
            <div className="card-constellation rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs uppercase tracking-widest text-primary">Filters</div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-4">{filterGroups}</div>
              <div className="mt-5 border-t border-border/60 pt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {filtered.length} EVENTS
              </div>
            </div>
          </aside>

          {/* Right results panel */}
          <section>
            {/* Desktop search + sort + view toggle */}
            <div className="hidden items-center gap-3 lg:flex">
              <div className="flex-1">{SearchBar}</div>
              <SortSelect value={sort} onChange={setSort} />
              <div className="inline-flex shrink-0 rounded-full border border-border bg-surface/40 p-1 font-mono text-[11px] uppercase tracking-widest">
                <button
                  onClick={() => setView("list")}
                  className={`rounded-full px-4 py-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  List
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`rounded-full px-4 py-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Calendar
                </button>
              </div>
            </div>

            {/* Mobile/tablet view toggle + sort */}
            <div className="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3 lg:hidden">
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {filtered.length} EVENTS
              </div>
              <SortSelect value={sort} onChange={setSort} />
              <div className="inline-flex rounded-full border border-border bg-surface/40 p-1 font-mono text-[11px] uppercase tracking-widest">
                <button
                  onClick={() => setView("list")}
                  className={`rounded-full px-4 py-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  List
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`rounded-full px-4 py-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  Calendar
                </button>
              </div>
            </div>

            {submittedQuery && (
              <div className="mb-4 hidden font-mono text-xs text-muted-foreground lg:block">
                Searching for “<span className="text-primary">{submittedQuery}</span>”
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <EmptyState />
              </div>
            ) : view === "list" ? (
              <div className="grid gap-5 md:grid-cols-2">
                {filtered.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            ) : (
              <MonthGrid events={filtered} />
            )}
          </section>
        </div>

      </main>
      <Footer />
    </>
  );
}

function CollapsibleFilterGroup({
  label,
  isOpen,
  onToggle,
  activeCount,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  activeCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
          {activeCount > 0 && (
            <span className="grid h-4 min-w-[1rem] place-items-center rounded-full bg-primary/20 px-1 text-[9px] font-semibold text-primary">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronIcon className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={isOpen ? "pb-4" : "hidden"}>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-all ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground/80 hover:border-primary/40"
      }`}
      style={active && color ? { borderColor: color, color, background: `color-mix(in oklab, ${color} 15%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface/40 px-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort events"
        className="bg-transparent text-xs font-medium text-foreground focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id} className="bg-surface text-foreground">
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}



function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MonthGrid({ events }: { events: WTMEvent[] }) {
  // Build October 2026 grid. Oct 1, 2026 is a Thursday.
  const firstDow = 4; // Thu
  const days = 31;
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null });
  for (let d = 1; d <= days; d++) cells.push({ day: d });
  while (cells.length % 7) cells.push({ day: null });

  const byDay: Record<number, WTMEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.date).getDate();
    (byDay[d] ??= []).push(e);
  }

  const weekColor = (day: number): string | null => {
    if (day >= 1 && day <= 10) return WEEKS.w1.color;
    if (day >= 12 && day <= 18) return WEEKS.w2.color;
    if (day >= 19 && day <= 25) return WEEKS.w3.color;
    if (day >= 26 && day <= 31) return WEEKS.w4.color;
    return null;
  };

  return (
    <div className="mt-4 card-constellation overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-border/60 bg-background/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          const wc = c.day ? weekColor(c.day) : null;
          const evs = c.day ? byDay[c.day] ?? [] : [];
          return (
            <div key={i} className="relative min-h-[110px] border-b border-r border-border/30 p-2">
              {wc && <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: wc }} />}
              {c.day && (
                <>
                  <div className="font-mono text-[11px] text-muted-foreground">{c.day}</div>
                  <div className="mt-1 space-y-1">
                    {evs.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        to="/event/$id"
                        params={{ id: e.id }}
                        className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-primary/10 hover:text-primary"
                        style={{ color: WEEKS[e.week].color }}
                      >
                        {e.title}
                      </Link>
                    ))}
                    {evs.length > 3 && <div className="font-mono text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full card-constellation rounded-3xl p-10 text-center md:p-14">
      <div className="font-mono text-[11px] uppercase tracking-widest text-primary">{"\n"}</div>
      <h3 className="mt-2 font-display text-2xl font-bold md:text-3xl">&nbsp;Coming soon</h3>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground whitespace-pre-line">
        We're finalizing WTM 2026 programming. Interested in hosting an event for Wisconsin Tech Month?&nbsp;{"\n\n"}
        <Link to="/host/submit" className="text-primary underline underline-offset-4 hover:text-primary/80">Submit your event</Link> by Sept. 15th.{"\n"}
      </p>
    </div>
  );
}
