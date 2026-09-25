import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Calendar, MapPin, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { listApprovedEvents } from "@/lib/events.functions";
import { dbEventToWtm } from "@/lib/db-events";
import { WEEKS, displayCity, type WTMEvent, type WeekKey } from "@/lib/wtm-data";

type Item =
  | { id: number; kind: "user" | "bot"; text: string }
  | { id: number; kind: "cards"; events: WTMEvent[]; more?: number }
  | { id: number; kind: "chips"; labels: string[] };

type Draft = Item extends infer T ? (T extends { id: number } ? Omit<T, "id"> : never) : never;

const MAX_CARDS = 8;
const HIDDEN_PREFIXES = ["/admin", "/auth", "/reset-password"];

function fmtDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return `${date} · ${time}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ChatWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [week, setWeek] = useState("");
  const [format, setFormat] = useState("");
  const [city, setCity] = useState("");
  const nextId = useRef(1);
  const chatRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const fetchApproved = useServerFn(listApprovedEvents);
  const { data } = useQuery({
    queryKey: ["approved-events"],
    queryFn: () => fetchApproved(),
    staleTime: 30_000,
    enabled: open,
  });
  const events = useMemo<WTMEvent[]>(
    () =>
      (data?.events ?? [])
        .map(dbEventToWtm)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );
  const cities = useMemo(
    () => Array.from(new Set(events.map((e) => displayCity(e.city)).filter(Boolean))).sort(),
    [events],
  );

  const push = (...drafts: Draft[]) =>
    setItems((prev) => [...prev, ...drafts.map((d) => ({ ...d, id: nextId.current++ }) as Item)]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  // Anchor the start of a new bot reply at the top so long lists read from the first card.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const last = items[items.length - 1];
    if (last?.kind === "user" || typing) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      return;
    }
    const starts = el.querySelectorAll<HTMLElement>("[data-start]");
    const target = starts[starts.length - 1];
    if (target) el.scrollTo({ top: Math.max(0, target.offsetTop - 6), behavior: "smooth" });
  }, [items, typing]);

  const cards = (list: WTMEvent[]): Draft[] => [
    { kind: "cards", events: list.slice(0, MAX_CARDS), more: Math.max(0, list.length - MAX_CARDS) },
  ];

  const withEvents = (text: string, list: WTMEvent[]): Draft[] =>
    list.length
      ? [{ kind: "bot", text }, ...cards(list)]
      : [{ kind: "bot", text: "I couldn't find events matching that. Try a different week, city or topic." }];

  function respond(raw: string): Draft[] {
    const q = raw.toLowerCase();
    const total = events.length;

    if (!total) {
      return [{ kind: "bot", text: "I don't see any published events yet. Check back soon, or browse the calendar." }];
    }
    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(q)) {
      return [
        { kind: "bot", text: `Hi there! I can help you explore all ${total} Wisconsin Tech Month events this October. Ask about a week, a city or a topic, or use the filters above.` },
        { kind: "chips", labels: ["Show all events", "MKE Tech Week", "Women in Tech Week", "AI events"] },
      ];
    }
    if (q.includes("help") || q.includes("what can you")) {
      return [{ kind: "bot", text: 'You can ask me things like:\n• "Events during Dev Week"\n• "What\'s happening in Green Bay?"\n• "AI events"\n• "Events on Oct 7"\n• "Are any events virtual?"\n\nOr use the Week / Format / City filters at the top.' }];
    }
    if (/how many|number of events|total events/.test(q)) {
      const byWeek = (Object.keys(WEEKS) as WeekKey[])
        .map((k) => `${WEEKS[k].name} (${events.filter((e) => e.week === k).length})`)
        .join(", ");
      return [
        { kind: "bot", text: `There are ${total} events across four weeks: ${byWeek}.` },
        { kind: "chips", labels: ["Show all events"] },
      ];
    }
    if (/all events|show everything|full (list|schedule)|list (all|events)|show all/.test(q)) {
      return withEvents(`Here's the full October lineup, all ${total} events:`, events);
    }
    if (/virtual|online|remote|hybrid|zoom/.test(q)) {
      const v = events.filter((e) => e.format !== "in-person");
      return v.length
        ? withEvents(`${plural(v.length, "event")} ${v.length === 1 ? "is" : "are"} virtual or hybrid:`, v)
        : [{ kind: "bot", text: `All ${total} events are in person. No virtual or hybrid sessions are listed right now.` }];
    }
    if (/in.?person|format/.test(q)) {
      return withEvents("Here are the in-person events:", events.filter((e) => e.format === "in-person"));
    }

    let wk: WeekKey | null = null;
    if (/mke|milwaukee tech week/.test(q)) wk = "w1";
    else if (/dev week|developer/.test(q)) wk = "w2";
    else if (/women|female week/.test(q) && q.includes("week")) wk = "w3";
    else if (/midwest/.test(q)) wk = "w4";
    if (wk) {
      const list = events.filter((e) => e.week === wk);
      return withEvents(`${WEEKS[wk].name} has ${plural(list.length, "event")}:`, list);
    }

    const matchedCity = cities.find((c) => q.includes(c.toLowerCase()));
    if (matchedCity) {
      const list = events.filter((e) => displayCity(e.city) === matchedCity);
      return withEvents(`${matchedCity} has ${plural(list.length, "event")}:`, list);
    }

    const dm = q.match(/(?:oct(?:ober)?\s*\.?\s*|on the\s+)(\d{1,2})/);
    if (dm) {
      const day = parseInt(dm[1], 10);
      const list = events.filter((e) => new Date(e.date).getUTCDate() === day);
      if (list.length) return withEvents(`On October ${day}:`, list);
      const days = Array.from(new Set(events.map((e) => new Date(e.date).getUTCDate()))).sort((a, b) => a - b);
      return [{ kind: "bot", text: `Nothing scheduled on October ${day}. Event days are: Oct ${days.join(", ")}.` }];
    }

    if (/latest|upcoming|next event|soonest|coming up|recent|newest|new event/.test(q)) {
      return [
        ...withEvents("Everything kicks off in October 2026. Here are the first events coming up:", events.slice(0, 5)),
        { kind: "chips", labels: ["Show all events"] },
      ];
    }
    if (/register|sign ?up|ticket|rsvp|link/.test(q)) {
      return [
        { kind: "bot", text: "Each event card links to its page, where you can register or RSVP. Which event are you interested in?" },
        { kind: "chips", labels: ["Show all events"] },
      ];
    }
    if (/thank|thx|bye|see you/.test(q)) {
      return [{ kind: "bot", text: "You're welcome. See you in October!" }];
    }
    if (/october|this month|whole month|calendar|schedule|what'?s (happening|on|going on)|happening/.test(q)) {
      return withEvents(`Here's the full October 2026 schedule, all ${total} events in order:`, events);
    }

    // Topic / keyword search across title, description, topics, audience and host.
    const stop = new Set(["the", "and", "for", "any", "are", "about", "events", "event", "with", "show", "find", "what", "where", "when", "have", "you", "there", "some", "me"]);
    const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !stop.has(t));
    if (tokens.length) {
      const hits = events.filter((e) => {
        const hay = [e.title, e.description, e.host, ...e.topics, ...e.audience].join(" ").toLowerCase();
        return tokens.some((t) => (t.length <= 2 ? new RegExp(`\\b${t}\\b`).test(hay) : hay.includes(t)));
      });
      if (hits.length) return withEvents(`Here's what I found for "${raw.trim()}":`, hits);
    }
    if (/\bevents?\b|\bshow\b|\blist\b|\bsee\b/.test(q)) {
      return withEvents(`Here's everything on the calendar, all ${total} events in order:`, events);
    }
    return [
      { kind: "bot", text: "I'm not sure about that one, but I can help with weeks, cities, dates, formats or topics. Try one of these:" },
      { kind: "chips", labels: ["Show all events", "AI events", "Events on Oct 7"] },
    ];
  }

  function ask(text: string) {
    const t = text.trim();
    if (!t) return;
    push({ kind: "user", text: t });
    setTyping(true);
    later(() => {
      setTyping(false);
      push(...respond(t));
    }, 650);
  }

  function applyFilters(next: { week: string; format: string; city: string }) {
    const list = events.filter(
      (e) =>
        (!next.week || WEEKS[e.week].name === next.week) &&
        (!next.format || e.format === next.format) &&
        (!next.city || displayCity(e.city) === next.city),
    );
    const label = [next.week, next.format && next.format.replace("-", " "), next.city].filter(Boolean).join(" · ") || "all events";
    push({ kind: "bot", text: `Filtered by ${label}: ${plural(list.length, "event")}` });
    if (list.length) push(...cards(list));
    else push({ kind: "bot", text: "No events match that combination. Try widening the filters." });
  }

  function showWelcome() {
    setTyping(true);
    later(() => {
      setTyping(false);
      push(
        { kind: "bot", text: "Welcome to Wisconsin Tech Month! Ask me anything about the events happening this October, or filter by week, format or city above." },
        { kind: "chips", labels: ["Show all events", "MKE Tech Week", "DEV Week", "Women in Tech Week", "Midwest Tech Week"] },
      );
    }, 700);
  }

  function toggle() {
    setOpen((o) => !o);
    if (!started) {
      setStarted(true);
      showWelcome();
    }
  }

  function reset() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setItems([]);
    setWeek("");
    setFormat("");
    setCity("");
    setInput("");
    showWelcome();
  }

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const selectCls =
    "min-w-0 flex-1 cursor-pointer rounded-lg border border-input bg-surface/70 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground/90 outline-none transition-colors hover:border-primary/50 focus:border-primary";
  const iconBtn =
    "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface/60 text-foreground/80 transition-colors hover:border-primary/50 hover:text-primary";

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Wisconsin Tech Month events chatbot"
          className="absolute bottom-16 right-0 flex h-[620px] max-h-[calc(100vh-7rem)] w-[388px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <img src={"/wtm-logo-white.png"} alt="Wisconsin Tech Month" width={944} height={412} className="h-7 w-auto shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-sm font-bold uppercase leading-tight tracking-wide">Event Assistant</h2>
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-teal" />
                Oct 2026{events.length ? ` · ${plural(events.length, "event")}` : ""}
              </p>
            </div>
            <button type="button" onClick={reset} aria-label="Start new chat" title="Start new chat" className={iconBtn}>
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className={iconBtn}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2 border-b border-border/60 bg-surface/30 px-4 py-2.5">
            <select
              aria-label="Filter by week"
              value={week}
              onChange={(e) => { setWeek(e.target.value); applyFilters({ week: e.target.value, format, city }); }}
              className={selectCls}
            >
              <option value="">All weeks</option>
              {(Object.keys(WEEKS) as WeekKey[]).map((k) => <option key={k}>{WEEKS[k].name}</option>)}
            </select>
            <select
              aria-label="Filter by format"
              value={format}
              onChange={(e) => { setFormat(e.target.value); applyFilters({ week, format: e.target.value, city }); }}
              className={selectCls}
            >
              <option value="">All formats</option>
              <option value="in-person">In person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <select
              aria-label="Filter by city"
              value={city}
              onChange={(e) => { setCity(e.target.value); applyFilters({ week, format, city: e.target.value }); }}
              className={selectCls}
            >
              <option value="">All cities</option>
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div ref={chatRef} className="relative flex flex-1 flex-col items-start gap-3 overflow-y-auto overflow-x-hidden px-4 py-4">
            {items.map((it) => {
              if (it.kind === "user")
                return (
                  <div key={it.id} className="max-w-[88%] self-end whitespace-pre-line break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground animate-in fade-in slide-in-from-bottom-2">
                    {it.text}
                  </div>
                );
              if (it.kind === "bot")
                return (
                  <div key={it.id} data-start className="max-w-[88%] self-start whitespace-pre-line break-words rounded-2xl rounded-bl-sm border border-border bg-surface/70 px-3.5 py-2.5 text-sm leading-relaxed text-foreground animate-in fade-in slide-in-from-bottom-2">
                    {it.text}
                  </div>
                );
              if (it.kind === "chips")
                return (
                  <div key={it.id} className="flex max-w-[88%] flex-wrap gap-2 self-start">
                    {it.labels.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => ask(l)}
                        className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                );
              if (it.kind !== "cards") return null;
              return (
                <div key={it.id} className="flex w-full flex-col gap-2.5 self-stretch">
                  {it.events.map((e) => <ChatEventCard key={e.id} event={e} />)}
                  {!!it.more && (
                    <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      +{it.more} more. Narrow it with the filters above or{" "}
                      <Link to="/calendar" search={{}} className="text-primary hover:underline">open the full calendar</Link>.
                    </p>
                  )}
                </div>
              );
            })}
            {typing && (
              <div data-start aria-label="Assistant is typing" className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-sm border border-border bg-surface/70 px-4 py-3">
                {[0, 150, 300].map((d) => (
                  <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); setInput(""); }}
            className="flex items-center gap-2 border-t border-border/60 bg-surface/30 px-4 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Ask about events… e.g. AI"
              aria-label="Type your question"
              className="min-w-0 flex-1 rounded-full border border-input bg-surface/70 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-all hover:shadow-glow-teal active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Close events chat" : "Open events chat"}
        aria-expanded={open}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow-teal transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && !started && <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-background bg-secondary" />}
      </button>
    </div>
  );
}

function ChatEventCard({ event }: { event: WTMEvent }): ReactNode {
  const week = WEEKS[event.week];
  return (
    <article className="card-constellation group rounded-xl p-3.5 transition-all animate-in fade-in slide-in-from-bottom-2 hover:border-primary/40 hover:shadow-glow-teal">
      <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest ${week.tagClass}`}>
        {week.name}
      </span>
      <h3 className="mt-2 font-display text-[15px] font-bold leading-snug transition-colors group-hover:text-primary">
        {event.title}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" />{fmtDate(event.date)}</span>
        <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" />{displayCity(event.city) || "Statewide"}</span>
        <span>{event.format.replace("-", " ")}</span>
      </div>
      <Link
        to="/event/$id"
        params={{ id: event.id }}
        className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-primary hover:underline"
      >
        View event &amp; register <ArrowUpRight className="h-3 w-3" />
      </Link>
    </article>
  );
}
