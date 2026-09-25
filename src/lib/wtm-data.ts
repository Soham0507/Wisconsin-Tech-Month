export type WeekKey = "w1" | "w2" | "w3" | "w4";

export const WEEKS: Record<WeekKey, { name: string; theme: string; dates: string; color: string; tagClass: string; }> = {
  w1: { name: "MKE Tech Week", theme: "Policy, advocacy & ecosystem builders", dates: "Oct 1–10", color: "var(--week-1)", tagClass: "bg-[color:var(--week-1)]/60 text-white border-[color:var(--week-1)]/80 ring-1 ring-black/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]" },
  w2: { name: "DEV Week", theme: "Hackathons, workshops & developer community", dates: "Oct 12–18", color: "var(--week-2)", tagClass: "bg-[color:var(--week-2)]/60 text-white border-[color:var(--week-2)]/80 ring-1 ring-black/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]" },
  w3: { name: "Women in Tech Week", theme: "Storytelling, networking & trailblazers", dates: "Oct 19–25", color: "var(--week-3)", tagClass: "bg-[color:var(--week-3)]/60 text-white border-[color:var(--week-3)]/80 ring-1 ring-black/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]" },
  w4: { name: "Midwest Tech Week", theme: "Regional collaboration across 12 midwest states", dates: "Oct 26–31", color: "var(--week-4)", tagClass: "bg-[color:var(--week-4)]/60 text-white border-[color:var(--week-4)]/80 ring-1 ring-black/25 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]" },
};

export type RegionState = "lit" | "emerging" | "open";

export type Region = {
  id: string;
  name: string;
  hub: string;
  state: RegionState;
  x: number;
  y: number;
  counties: number;
};

export const REGIONS: Region[] = [
  { id: "northwoods",   name: "Northwoods",       hub: "Rhinelander",   state: "emerging", x: 291, y: 203, counties: 9 },
  { id: "superior",     name: "Superior",         hub: "Superior",      state: "open",     x: 120, y: 135, counties: 5 },
  { id: "chippewa",     name: "Chippewa Valley",  hub: "Eau Claire",    state: "lit",      x: 134, y: 292, counties: 8 },
  { id: "lacrosse",     name: "La Crosse",        hub: "La Crosse",     state: "emerging", x: 154, y: 398, counties: 7 },
  { id: "foxvalley",    name: "Fox Valley",       hub: "Green Bay",     state: "lit",      x: 405, y: 318, counties: 10 },
  { id: "doorpen",      name: "Door Peninsula",   hub: "Sturgeon Bay",  state: "open",     x: 425, y: 275, counties: 3 },
  { id: "madison",      name: "Madison",          hub: "Madison",       state: "lit",      x: 292, y: 488, counties: 11 },
  { id: "milwaukee",    name: "Milwaukee",        hub: "Milwaukee",     state: "lit",      x: 400, y: 510, counties: 6 },
];

// Primary hubs — always shown on the map, even with 0 events (with empty state).
export const PRIMARY_HUB_IDS = new Set(["milwaukee", "madison", "foxvalley", "chippewa"]);

// City → region fallback used when an event row has no `region` set.
export const CITY_TO_REGION: Record<string, string> = {
  "Milwaukee": "milwaukee",
  "Wauwatosa": "milwaukee", "West Allis": "milwaukee", "Brookfield": "milwaukee",
  "Waukesha": "milwaukee", "Menomonee Falls": "milwaukee", "Mequon": "milwaukee",
  "Oak Creek": "milwaukee", "Franklin": "milwaukee", "Greenfield": "milwaukee",
  "New Berlin": "milwaukee", "Cudahy": "milwaukee", "South Milwaukee": "milwaukee",
  "Racine": "milwaukee", "Kenosha": "milwaukee",
  "Madison": "madison", "Middleton": "madison", "Fitchburg": "madison",
  "Verona": "madison", "Sun Prairie": "madison", "Janesville": "madison",
  "Beloit": "madison", "Whitewater": "madison", "Watertown": "madison",
  "Green Bay": "foxvalley", "De Pere": "foxvalley", "Ashwaubenon": "foxvalley",
  "Appleton": "foxvalley", "Oshkosh": "foxvalley", "Neenah": "foxvalley",
  "Menasha": "foxvalley", "Kaukauna": "foxvalley", "Fond du Lac": "foxvalley",
  "Sheboygan": "foxvalley", "Manitowoc": "foxvalley", "Two Rivers": "foxvalley",
  "Eau Claire": "chippewa", "Chippewa Falls": "chippewa", "Menomonie": "chippewa",
  "River Falls": "chippewa", "Hudson": "chippewa",
  "La Crosse": "lacrosse", "Onalaska": "lacrosse", "Platteville": "lacrosse",
  "Sturgeon Bay": "doorpen",
  "Rhinelander": "northwoods", "Wausau": "northwoods", "Stevens Point": "northwoods",
  "Marshfield": "northwoods", "Antigo": "northwoods", "Merrill": "northwoods",
  "Superior": "superior", "Ashland": "superior", "Hayward": "superior",
};

export type EventFormat = "in-person" | "virtual" | "hybrid";

export type WTMEvent = {
  id: string;
  title: string;
  description: string;
  week: WeekKey;
  format: EventFormat;
  region?: string; // legacy region id (optional; city is the primary location)
  city: string;
  venue: string;
  address: string;
  date: string;        // ISO
  endDate?: string;
  topics: string[];
  audience: string[];
  host: string;
  hostUrl?: string;
  image?: string;
  registrationUrl: string;
  capacity?: number;
  status: "approved" | "pending" | "needs-changes";
  createdAt: string; // ISO date the event was added to the platform
};

export const EVENTS: WTMEvent[] = [
  {
    id: "mke-founder-summit",
    title: "Wisconsin Founder Summit",
    description: "A full-day gathering of Wisconsin's earliest-stage founders, with capital office hours, a pitch showcase, and a closing reception at the Harbor District.",
    week: "w1", format: "in-person", region: "milwaukee", city: "Milwaukee",
    venue: "The Avenue", address: "275 W Wisconsin Ave, Milwaukee, WI 53203",
    date: "2026-10-06T09:00:00", endDate: "2026-10-06T18:00:00",
    topics: ["Startups", "Venture", "Pitch"], audience: ["Founders", "Investors"],
    host: "gener8tor", registrationUrl: "#", capacity: 400, status: "approved",
      createdAt: "2026-09-28",
  },
  {
    id: "madison-ai-night",
    title: "Madison AI Night",
    description: "Five Wisconsin AI teams demo what they're shipping, followed by a roundtable on responsible deployment in the Midwest.",
    week: "w1", format: "hybrid", region: "madison", city: "Madison",
    venue: "StartingBlock Madison", address: "821 E Washington Ave, Madison, WI 53703",
    date: "2026-10-08T17:30:00",
    topics: ["AI", "Demo Night"], audience: ["Engineers", "Founders"],
    host: "Forward Tech", registrationUrl: "#", capacity: 220, status: "approved",
      createdAt: "2026-09-25",
  },
  {
    id: "ec-hardware-tour",
    title: "Chippewa Valley Hardware Tour",
    description: "Behind-the-scenes tours of three Eau Claire-area hardware and electronics studios, ending with a maker-meet at Pablo Center.",
    week: "w2", format: "in-person", region: "chippewa", city: "Eau Claire",
    venue: "Pablo Center at the Confluence", address: "128 Graham Ave, Eau Claire, WI 54701",
    date: "2026-10-14T13:00:00",
    topics: ["Hardware", "Manufacturing"], audience: ["Engineers", "Operators"],
    host: "Chippewa Valley Innovation Hub", registrationUrl: "#", capacity: 80, status: "approved",
      createdAt: "2026-09-20",
  },
  {
    id: "gb-industry40",
    title: "Industry 4.0 in the Fox Valley",
    description: "How regional manufacturers are putting sensors, vision systems, and ML onto the plant floor — with live shop-floor walk-throughs.",
    week: "w2", format: "in-person", region: "foxvalley", city: "Green Bay",
    venue: "Titletown Tech", address: "1041 Lombardi Ave, Green Bay, WI 54304",
    date: "2026-10-15T08:30:00",
    topics: ["Manufacturing", "IoT", "ML"], audience: ["Operators", "Engineers"],
    host: "NEW Manufacturing Alliance", registrationUrl: "#", capacity: 180, status: "approved",
      createdAt: "2026-09-18",
  },
  {
    id: "virtual-rural-broadband",
    title: "Rural Broadband Roundtable",
    description: "A virtual roundtable on closing Wisconsin's rural connectivity gaps — co-ops, municipal fiber, and fixed wireless.",
    week: "w3", format: "virtual", region: "northwoods", city: "Statewide",
    venue: "Online (Zoom)", address: "Virtual",
    date: "2026-10-21T12:00:00",
    topics: ["Broadband", "Policy"], audience: ["Government", "Community"],
    host: "WI Broadband Office", registrationUrl: "#", status: "approved",
      createdAt: "2026-09-12",
  },
  {
    id: "mad-women-in-tech",
    title: "Women in Wisconsin Tech Gala",
    description: "An evening honoring the women shaping Wisconsin's tech ecosystem, with keynote, awards, and a regional founders showcase.",
    week: "w3", format: "in-person", region: "madison", city: "Madison",
    venue: "Monona Terrace", address: "1 John Nolen Dr, Madison, WI 53703",
    date: "2026-10-22T18:00:00",
    topics: ["Community", "Inclusion"], audience: ["All"],
    host: "Doyenne Group", registrationUrl: "#", capacity: 600, status: "approved",
      createdAt: "2026-09-05",
  },
  {
    id: "lax-student-hack",
    title: "Driftless Student Hackathon",
    description: "A 24-hour student hack across UW-La Crosse, Viterbo, and Western Tech — sponsored prizes for civic tech and ag-tech tracks.",
    week: "w4", format: "in-person", region: "lacrosse", city: "La Crosse",
    venue: "UW-La Crosse Cleary Center", address: "1725 State St, La Crosse, WI 54601",
    date: "2026-10-28T17:00:00", endDate: "2026-10-29T17:00:00",
    topics: ["Hackathon", "Students"], audience: ["Students"],
    host: "UW-La Crosse CS Dept", registrationUrl: "#", capacity: 150, status: "approved",
      createdAt: "2026-08-28",
  },
  {
    id: "mke-apprenticeship",
    title: "Tech Apprenticeship Open House",
    description: "Meet ten Wisconsin employers building paid tech apprenticeship pipelines for new and returning talent.",
    week: "w4", format: "hybrid", region: "milwaukee", city: "Milwaukee",
    venue: "MSOE Diercks Hall", address: "1025 N Broadway, Milwaukee, WI 53202",
    date: "2026-10-29T16:00:00",
    topics: ["Talent", "Education"], audience: ["Students", "Career Changers"],
    host: "Milwaukee Tech Hub Coalition", registrationUrl: "#", capacity: 250, status: "approved",
      createdAt: "2026-08-20",
  },
  {
    id: "doorpen-coastal",
    title: "Coastal Tech Retreat",
    description: "A small-format founder retreat on the Door Peninsula — long walks, longer conversations, no pitch decks.",
    week: "w3", format: "in-person", region: "doorpen", city: "Sturgeon Bay",
    venue: "The Inn at Cedar Crossing", address: "336 Louisiana St, Sturgeon Bay, WI 54235",
    date: "2026-10-23T15:00:00", endDate: "2026-10-25T11:00:00",
    topics: ["Founders", "Retreat"], audience: ["Founders"],
    host: "Door County Economic Development", registrationUrl: "#", capacity: 40, status: "approved",
      createdAt: "2026-08-10",
  },
];

export const FORMATS: { id: EventFormat; label: string }[] = [
  { id: "in-person", label: "In person" },
  { id: "virtual", label: "Virtual" },
  { id: "hybrid", label: "Hybrid" },
];

export const HOST_ORG_TYPES: string[] = [
  "Company",
  "Nonprofit",
  "Government",
  "University / College",
  "Community Group",
  "Media / Press",
  "Other",
];

export const TOPICS = Array.from(new Set(EVENTS.flatMap(e => e.topics))).sort();
export const AUDIENCES = Array.from(new Set(EVENTS.flatMap(e => e.audience))).sort();

// Curated selectable lists for the submit form.
export const TOPIC_OPTIONS: string[] = [
  "AI", "Data", "Cybersecurity", "Hardware", "Startups",
  "Product & Design", "Web/Mobile", "Community", "Policy", "Education",
];

export const AUDIENCE_OPTIONS: string[] = [
  "Founders", "Investors", "Engineers", "Designers",
  "Students", "Operators", "Community",
];


// Wisconsin cities and regional areas (kept for backwards-compatible references).
export const WI_CITIES: string[] = [
  "Milwaukee", "Madison", "Green Bay", "Kenosha", "Racine", "Appleton",
  "Waukesha", "Eau Claire", "Oshkosh", "Janesville", "West Allis",
  "La Crosse", "Sheboygan", "Wauwatosa", "Fond du Lac", "New Berlin",
  "Wausau", "Brookfield", "Beloit", "Greenfield", "Franklin", "Oak Creek",
  "Manitowoc", "West Bend", "Sun Prairie", "Superior", "Stevens Point",
  "Neenah", "Fitchburg", "Menomonee Falls", "De Pere", "Middleton",
  "Mequon", "Marshfield", "Muskego", "Watertown", "Cudahy",
  "South Milwaukee", "Pewaukee", "Whitewater", "Two Rivers",
  "Chippewa Falls", "Kaukauna", "River Falls", "Onalaska", "Verona",
  "Waupun", "Ashwaubenon", "Menasha", "Hudson", "Sturgeon Bay",
  "Rhinelander", "Platteville", "Baraboo", "Portage", "Reedsburg",
  "Marinette", "Merrill", "Antigo", "Ashland", "Hayward",
  // Regional areas
  "Chippewa Valley", "Fox Valley", "Door Peninsula", "Northwoods",
  "Driftless Region", "Statewide", "Virtual",
];

// Midwest cities across the 12 Midwestern states. Used for city autocomplete
// in the host submit form and calendar search suggestions.
export const MIDWEST_CITIES: string[] = [
  ...WI_CITIES.filter((c) => !["Statewide", "Virtual"].includes(c)).map((c) => `${c}, WI`),
  // Illinois
  "Chicago, IL", "Aurora, IL", "Naperville, IL", "Joliet, IL", "Rockford, IL",
  "Springfield, IL", "Elgin, IL", "Peoria, IL", "Champaign, IL", "Waukegan, IL",
  "Evanston, IL", "Bloomington, IL", "Schaumburg, IL", "Decatur, IL", "Urbana, IL",
  // Indiana
  "Indianapolis, IN", "Fort Wayne, IN", "Evansville, IN", "South Bend, IN",
  "Carmel, IN", "Fishers, IN", "Bloomington, IN", "Hammond, IN", "Gary, IN",
  "Lafayette, IN", "Muncie, IN", "West Lafayette, IN",
  // Iowa
  "Des Moines, IA", "Cedar Rapids, IA", "Davenport, IA", "Sioux City, IA",
  "Iowa City, IA", "Waterloo, IA", "Ames, IA", "Council Bluffs, IA",
  "West Des Moines, IA", "Dubuque, IA",
  // Kansas
  "Wichita, KS", "Overland Park, KS", "Kansas City, KS", "Olathe, KS",
  "Topeka, KS", "Lawrence, KS", "Manhattan, KS",
  // Michigan
  "Detroit, MI", "Grand Rapids, MI", "Ann Arbor, MI", "Lansing, MI",
  "Warren, MI", "Sterling Heights, MI", "Flint, MI", "Dearborn, MI",
  "Livonia, MI", "Kalamazoo, MI", "Traverse City, MI", "Marquette, MI",
  // Minnesota
  "Minneapolis, MN", "Saint Paul, MN", "Rochester, MN", "Duluth, MN",
  "Bloomington, MN", "Brooklyn Park, MN", "Plymouth, MN", "Woodbury, MN",
  "Eagan, MN", "Maple Grove, MN", "Saint Cloud, MN", "Mankato, MN",
  // Missouri
  "Kansas City, MO", "Saint Louis, MO", "Springfield, MO", "Columbia, MO",
  "Independence, MO", "Lee's Summit, MO", "O'Fallon, MO", "Saint Charles, MO",
  "Saint Joseph, MO",
  // Nebraska
  "Omaha, NE", "Lincoln, NE", "Bellevue, NE", "Grand Island, NE", "Kearney, NE",
  // North Dakota
  "Fargo, ND", "Bismarck, ND", "Grand Forks, ND", "Minot, ND",
  // Ohio
  "Columbus, OH", "Cleveland, OH", "Cincinnati, OH", "Toledo, OH",
  "Akron, OH", "Dayton, OH", "Parma, OH", "Canton, OH", "Youngstown, OH",
  // South Dakota
  "Sioux Falls, SD", "Rapid City, SD", "Aberdeen, SD", "Brookings, SD",
  // Regional / virtual
  "Statewide", "Midwest-wide", "Virtual",
];

export function regionById(id: string) {
  return REGIONS.find(r => r.id === id);
}

export function eventCountByRegion() {
  const map: Record<string, number> = {};
  for (const e of EVENTS) if (e.region) map[e.region] = (map[e.region] ?? 0) + 1;
  return map;
}

export function totals() {
  const byRegion = eventCountByRegion();
  const lit = REGIONS.filter(r => byRegion[r.id]).length;
  const counties = REGIONS.filter(r => byRegion[r.id]).reduce((s, r) => s + r.counties, 0);
  return {
    events: EVENTS.length,
    regionsLit: lit,
    regionsTotal: REGIONS.length,
    counties,
  };
}

/** Strip a trailing state code (", WI", ", IL", …) so cities render as just the city name. */
export function displayCity(city?: string | null): string {
  if (!city) return "";
  return city.replace(/,\s*[A-Za-z]{2}\.?$/, "").trim();
}


/** Lookup key for a city: state suffix removed, trimmed. */
export function normalizeCityKey(city?: string | null): string {
  return displayCity(city);
}

/** Approximate coordinates ([lon, lat]) for Wisconsin cities and regional areas. */
export const WI_CITY_COORDS: Record<string, [number, number]> = {
  "Milwaukee": [-87.9065, 43.0389], "Madison": [-89.4012, 43.0731],
  "Green Bay": [-88.0133, 44.5133], "Kenosha": [-87.8212, 42.5847],
  "Racine": [-87.7829, 42.7261], "Appleton": [-88.4154, 44.2619],
  "Waukesha": [-88.2315, 43.0117], "Eau Claire": [-91.4985, 44.8113],
  "Oshkosh": [-88.5426, 44.0247], "Janesville": [-89.0187, 42.6828],
  "West Allis": [-88.007, 43.0167], "La Crosse": [-91.2396, 43.8014],
  "Sheboygan": [-87.7145, 43.7508], "Wauwatosa": [-88.0076, 43.0495],
  "Fond du Lac": [-88.447, 43.773], "New Berlin": [-88.1084, 42.9764],
  "Wausau": [-89.6301, 44.9591], "Brookfield": [-88.1065, 43.0605],
  "Beloit": [-89.0318, 42.5083], "Greenfield": [-88.0126, 42.9614],
  "Franklin": [-88.0342, 42.8889], "Oak Creek": [-87.8631, 42.8858],
  "Manitowoc": [-87.6576, 44.0886], "West Bend": [-88.1834, 43.4253],
  "Sun Prairie": [-89.2137, 43.1836], "Superior": [-92.1041, 46.7208],
  "Stevens Point": [-89.5746, 44.5236], "Neenah": [-88.4626, 44.1858],
  "Fitchburg": [-89.4287, 42.9603], "Menomonee Falls": [-88.117, 43.1789],
  "De Pere": [-88.0604, 44.4489], "Middleton": [-89.5043, 43.0972],
  "Mequon": [-87.9867, 43.2367], "Marshfield": [-90.1718, 44.6688],
  "Muskego": [-88.1367, 42.9053], "Watertown": [-88.729, 43.1947],
  "Cudahy": [-87.8613, 42.9597], "South Milwaukee": [-87.8606, 42.9106],
  "Pewaukee": [-88.2615, 43.0803], "Whitewater": [-88.7323, 42.8336],
  "Two Rivers": [-87.5692, 44.1531], "Chippewa Falls": [-91.3929, 44.9369],
  "Kaukauna": [-88.2751, 44.278], "River Falls": [-92.6238, 44.8614],
  "Onalaska": [-91.2332, 43.8844], "Verona": [-89.5333, 42.9911],
  "Waupun": [-88.729, 43.6333], "Ashwaubenon": [-88.08, 44.4822],
  "Menasha": [-88.4465, 44.2022], "Hudson": [-92.7568, 44.9747],
  "Sturgeon Bay": [-87.377, 44.8342], "Rhinelander": [-89.4121, 45.6366],
  "Platteville": [-90.4785, 42.7342], "Baraboo": [-89.7443, 43.4711],
  "Portage": [-89.4626, 43.5391], "Reedsburg": [-90.0026, 43.5325],
  "Marinette": [-87.6306, 45.0999], "Merrill": [-89.6835, 45.1805],
  "Antigo": [-89.1522, 45.14], "Ashland": [-90.8838, 46.5924],
  "Hayward": [-91.4846, 46.013],
  "Chippewa Valley": [-91.5, 44.81], "Fox Valley": [-88.42, 44.26],
  "Door Peninsula": [-87.38, 44.83], "Northwoods": [-89.41, 45.64],
  "Driftless Region": [-90.6, 43.5],
};

/**
 * Project [lon, lat] into the StarMap's 500x600 viewBox. Matches the
 * (web-mercator) transform used to generate the Wisconsin outline path.
 */
export function projectToMap(lon: number, lat: number): { x: number; y: number } {
  const mercator = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return {
    x: 75.15268167 * lon + 7010.591565,
    y: 4070.730271 - 4306.097775 * mercator,
  };
}

/**
 * Resolve an event's region id. Only an explicit region, or a city that IS the
 * region's hub city, lights a region star — every other city gets its own star
 * so the map shows real city names instead of lumping them into a region hub.
 */
export function resolveRegionId(evt: { region?: string | null; city?: string | null }): string | null {
  if (evt.region) return evt.region;
  // Suburbs/metro cities roll up to their region hub (e.g. Brookfield → Milwaukee),
  // while hub cities themselves (Milwaukee, Green Bay, …) get their own city star.
  const key = normalizeCityKey(evt.city);
  if (!key) return null;
  if (REGIONS.some((r) => r.hub.toLowerCase() === key.toLowerCase())) return null;
  const match = Object.keys(CITY_TO_REGION).find((k) => k.toLowerCase() === key.toLowerCase());
  return match ? CITY_TO_REGION[match]! : null;
}

/** Best-effort coordinate lookup: exact match, then a known parent city ("Sheboygan Falls" → "Sheboygan"). */
export function lookupCityCoords(city: string): [number, number] | null {
  if (WI_CITY_COORDS[city]) return WI_CITY_COORDS[city];
  const lower = city.toLowerCase();
  const match = Object.keys(WI_CITY_COORDS).find(
    (k) => lower !== k.toLowerCase() && (lower.startsWith(k.toLowerCase() + " ") || lower.endsWith(" " + k.toLowerCase())),
  );
  return match ? WI_CITY_COORDS[match]! : null;
}


export type CityNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  count: number;
  events: { id: string; title: string; city: string }[];
};

/** Build counts + eventsByRegion buckets from a list of events. */
export function buildMapData(events: Array<{ id: string; title: string; city?: string | null; region?: string | null }>) {
  const counts: Record<string, number> = {};
  const eventsByRegion: Record<string, { id: string; title: string; city: string }[]> = {};
  const cityMap = new Map<string, CityNode>();

  for (const e of events) {
    const rid = resolveRegionId(e);
    if (rid) {
      counts[rid] = (counts[rid] ?? 0) + 1;
      (eventsByRegion[rid] ||= []).push({ id: e.id, title: e.title, city: e.city ?? "" });
      continue;
    }
    // No hub match — give the city its own (smaller) light when we can locate it.
    const key = normalizeCityKey(e.city);
    const coords = key ? lookupCityCoords(key) : null;
    if (!coords) continue;

    let node = cityMap.get(key);
    if (!node) {
      const { x, y } = projectToMap(coords[0], coords[1]);
      node = { id: `city:${key}`, name: key, x, y, count: 0, events: [] };
      cityMap.set(key, node);
    }
    node.count += 1;
    node.events.push({ id: e.id, title: e.title, city: e.city ?? "" });
  }

  return { counts, eventsByRegion, cityNodes: Array.from(cityMap.values()) };
}


