import { useState } from "react";
import { REGIONS, PRIMARY_HUB_IDS, displayCity, type CityNode, type Region } from "@/lib/wtm-data";
import { Link } from "@tanstack/react-router";

// Accurate Wisconsin outline derived from US states GeoJSON (PublicaMundi),
// projected into the 500x600 viewBox with uniform scaling and 30px padding.
const WI_PATH =
  "M 215.6 106.4 L 229.6 113.0 L 237.9 131.5 L 315.2 153.5 L 347.3 169.5 L 357.2 166.0 L 389.3 176.6 L 398.0 190.2 L 413.6 203.2 L 412.8 222.0 L 405.8 236.7 L 423.5 239.0 L 416.5 254.2 L 428.0 265.3 L 425.1 278.1 L 410.7 280.5 L 398.4 304.8 L 393.9 321.6 L 402.5 324.5 L 414.0 313.5 L 426.4 292.7 L 442.0 284.5 L 454.4 257.7 L 470.0 251.9 L 468.8 265.9 L 458.1 278.7 L 437.1 322.8 L 431.3 347.0 L 431.7 364.2 L 423.9 370.0 L 416.9 393.4 L 419.4 413.4 L 412.8 426.5 L 403.7 458.7 L 405.8 484.1 L 414.8 506.6 L 412.0 536.3 L 337.9 536.3 L 198.8 534.6 L 193.4 521.7 L 166.7 510.0 L 160.9 493.7 L 158.4 470.6 L 167.5 458.2 L 156.4 448.0 L 155.5 432.7 L 151.4 420.8 L 153.5 404.3 L 139.1 381.4 L 127.1 377.4 L 105.7 359.6 L 102.0 345.8 L 79.0 334.3 L 71.2 322.8 L 55.5 321.0 L 35.8 302.0 L 41.1 263.0 L 39.5 244.9 L 48.1 228.5 L 38.6 215.0 L 30.0 213.8 L 31.2 198.5 L 48.5 175.5 L 69.9 166.6 L 74.5 160.1 L 74.5 95.6 L 89.7 86.6 L 95.4 91.4 L 112.3 92.6 L 164.6 74.0 L 183.9 63.7 L 190.5 71.6 L 180.2 86.0 L 204.9 104.6 L 215.6 106.4 Z";

const BG_STARS = Array.from({ length: 220 }, (_, i) => ({
  cx: (i * 53 + (i % 11) * 7) % 500,
  cy: (i * 71 + (i % 13) * 5) % 600,
  r: ((i * 13) % 17) / 20 + 0.15,
  delay: (i % 9) * 0.35,
  op: 0.25 + ((i * 17) % 50) / 100,
}));

const INNER_STARS = (() => {
  const pts: { cx: number; cy: number; r: number; delay: number }[] = [];
  let s = 7;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 90; i++) {
    pts.push({ cx: 30 + rand() * 440, cy: 60 + rand() * 480, r: 0.4 + rand() * 0.9, delay: rand() * 4 });
  }
  return pts;
})();

const INNER_LINKS = (() => {
  const links: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
  for (let i = 0; i < INNER_STARS.length; i++) {
    for (let j = i + 1; j < INNER_STARS.length; j++) {
      const a = INNER_STARS[i], b = INNER_STARS[j];
      const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      if (d < 55) links.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, o: (1 - d / 55) * 0.18 });
    }
  }
  return links;
})();

export type StarMapEvent = { id: string; title: string; city: string };

type Props = {
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  counts: Record<string, number>;
  eventsByRegion: Record<string, StarMapEvent[]>;
  cityNodes?: CityNode[];
};

export function StarMap({ selected, onSelect, counts, eventsByRegion, cityNodes = [] }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? selected ?? null;
  const activeCity = cityNodes.find((c) => c.id === active) ?? null;
  // A real city star always wins over its region placeholder, so we never show
  // a region label (e.g. "Fox Valley") standing in for an actual city.
  const cityNames = new Set(cityNodes.map((c) => c.name.toLowerCase()));
  const visibleRegions = REGIONS.filter(
    (r) => !cityNames.has(r.hub.toLowerCase()) && !cityNames.has(r.name.toLowerCase()),
  );


  return (
    <div className="relative">
      <svg viewBox="0 0 500 600" className="block h-auto w-full" role="img" aria-label="Star map of Wisconsin showing event regions">
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.82 0.13 185)" stopOpacity="0.60" />
            <stop offset="100%" stopColor="oklch(0.82 0.13 185)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-purple" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.70 0.18 295)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="oklch(0.70 0.18 295)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="halo-white" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="state-glow" cx="50%" cy="55%" r="60%">
            <stop offset="0%" stopColor="oklch(0.82 0.13 185)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="oklch(0.82 0.13 185)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="wi-clip"><path d={WI_PATH} /></clipPath>
        </defs>

        {BG_STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="oklch(0.95 0.02 250)" opacity={s.op} className="twinkle" style={{ animationDelay: `${s.delay}s` }} />
        ))}

        <g clipPath="url(#wi-clip)">
          {INNER_LINKS.map((l, i) => (
            <line key={`il-${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="oklch(0.82 0.13 185)" strokeWidth="0.4" opacity={l.o} />
          ))}
          {INNER_STARS.map((s, i) => (
            <circle key={`in-${i}`} cx={s.cx} cy={s.cy} r={s.r} fill="oklch(0.92 0.08 185)" opacity={0.55} className="twinkle" style={{ animationDelay: `${s.delay}s` }} />
          ))}
        </g>

        <path d={WI_PATH} fill="oklch(0.20 0.045 265 / 0.55)" stroke="oklch(0.82 0.13 185 / 0.55)" strokeWidth="1.4" />
        <path d={WI_PATH} fill="url(#state-glow)" />


        <ConstellationLines counts={counts} />

        {visibleRegions.map(r => (
          <RegionStar
            key={r.id}
            region={r}
            count={counts[r.id] ?? 0}
            isActive={active === r.id}
            onHover={setHover}
            onClick={() => onSelect?.(selected === r.id ? null : r.id)}
          />
        ))}

        {cityNodes.map((c) => (
          <CityStar
            key={c.id}
            node={c}
            isActive={active === c.id}
            onHover={setHover}
            onClick={() => onSelect?.(selected === c.id ? null : c.id)}
          />
        ))}
      </svg>

      {activeCity ? (
        <MapPopover name={activeCity.name} x={activeCity.x} y={activeCity.y} events={activeCity.events} count={activeCity.count} filterCity={activeCity.name} />
      ) : (
        active && <RegionPopover regionId={active} events={eventsByRegion[active] ?? []} count={counts[active] ?? 0} />
      )}


    </div>
  );
}

function ConstellationLines({ counts }: { counts: Record<string, number> }) {
  const byId = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<string, Region>;
  const CONNECTIONS: { a: string; b: string }[] = [
    // Hub-to-hub core
    { a: "chippewa", b: "foxvalley" },
    { a: "chippewa", b: "madison" },
    { a: "foxvalley", b: "milwaukee" },
    { a: "madison", b: "milwaukee" },
    { a: "madison", b: "foxvalley" },
    // Hub-to-spoke (includes empty-state regions)
    { a: "chippewa", b: "superior" },
    { a: "chippewa", b: "lacrosse" },
    { a: "chippewa", b: "northwoods" },
    { a: "foxvalley", b: "northwoods" },
    { a: "foxvalley", b: "doorpen" },
    { a: "superior", b: "northwoods" },
    { a: "doorpen", b: "milwaukee" },
    { a: "madison", b: "lacrosse" },
  ];

  return (
    <g strokeWidth="0.6">
      {CONNECTIONS.map(({ a, b }, i) => {
        const ra = byId[a];
        const rb = byId[b];
        if (!ra || !rb) return null;
        const lit = (counts[a] ?? 0) > 0 && (counts[b] ?? 0) > 0;
        const opacity = lit ? 0.6 : 0.4;
        return (
          <line
            key={i}
            x1={ra.x} y1={ra.y} x2={rb.x} y2={rb.y}
            stroke="oklch(0.82 0.13 185)"
            opacity={opacity}
          />
        );
      })}
    </g>
  );
}



function RegionStar({ region, count, isActive, onHover, onClick }: { region: Region; count: number; isActive: boolean; onHover: (id: string | null) => void; onClick: () => void }) {
  const isLit = count > 0;
  const isPrimary = PRIMARY_HUB_IDS.has(region.id);
  const isPrimaryEmpty = !isLit && isPrimary;

  const r = isActive ? 11 : isLit ? 8 : isPrimaryEmpty ? 6 : 5;
  const fill = isLit ? "oklch(0.82 0.13 185)" : "oklch(0.70 0.02 250)";

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(region.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(region.id)}
      onBlur={() => onHover(null)}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${region.name}, ${count} events`}
    >
      <circle cx={region.x} cy={region.y} r={r} fill={isLit ? fill : "#ffffff"} fillOpacity={isLit ? 1 : 0.75} className={isLit ? "pulse-star" : ""} />



      <text
        x={region.x} y={region.y + 22}
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        fontWeight="600"
        fill={isLit ? "oklch(0.97 0.01 250)" : "oklch(0.75 0.02 250)"}
        opacity={isLit ? 0.95 : 0.7}
        style={{ textTransform: "uppercase", letterSpacing: "1.5px" }}
      >
        {region.name}
      </text>
    </g>
  );
}

function CityStar({ node, isActive, onHover, onClick }: { node: CityNode; isActive: boolean; onHover: (id: string | null) => void; onClick: () => void }) {
  const isLit = node.count > 0;
  const r = isActive ? 8 : isLit ? 6 : 4;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(node.id)}
      onBlur={() => onHover(null)}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${node.name}, ${node.count} events`}
    >
      <circle cx={node.x} cy={node.y} r={r} fill="oklch(0.82 0.13 185)" fillOpacity={0.75} className="pulse-star" />
      <text
        x={node.x} y={node.y + 17}
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        fontWeight="600"
        fill="oklch(0.92 0.02 250)"
        opacity={0.75}
        style={{ textTransform: "uppercase", letterSpacing: "1.2px" }}
      >
        {node.name}
      </text>
    </g>
  );
}

function RegionPopover({ regionId, events, count }: { regionId: string; events: StarMapEvent[]; count: number }) {
  const region = REGIONS.find(r => r.id === regionId);
  if (!region) return null;
  return (
    <MapPopover name={region.name} x={region.x} y={region.y} events={events} count={count} filterCity={region.hub} />
  );
}

function MapPopover({ name, x, y, events, count, filterCity }: { name: string; x: number; y: number; events: StarMapEvent[]; count: number; filterCity: string }) {
  const shown = events.slice(0, 3);

  // Position relative to the SVG viewBox (500x600) using percentages.
  const leftPct = (x / 500) * 100;
  const topPct = (y / 600) * 100;
  const flipX = x > 300; // right half → open to the left
  const flipY = y > 380; // bottom half → open upward

  const style: React.CSSProperties = {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    transform: `translate(${flipX ? "calc(-100% - 14px)" : "14px"}, ${flipY ? "calc(-100% - 14px)" : "14px"})`,
  };

  return (
    <div style={style} className="card-constellation pointer-events-auto absolute z-10 w-72 rounded-xl p-4 shadow-glow-teal md:w-80">
      <div className="font-display text-lg font-bold">{name}</div>

      {count === 0 ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">No events here yet.</p>
          <Link to="/host" className="mt-3 inline-block rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:shadow-glow-purple">
            Bring WTM to {name}
          </Link>
        </>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {shown.map(e => (
              <li key={e.id}>
                <Link to="/event/$id" params={{ id: e.id }} className="block rounded-lg border border-border/60 p-2 hover:border-primary/50">
                  <div className="font-display text-sm font-semibold">{e.title}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{displayCity(e.city)}</div>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/calendar" search={{ city: filterCity }} className="mt-3 inline-block font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
            View all {filterCity} events →
          </Link>
        </>
      )}
    </div>
  );

}

