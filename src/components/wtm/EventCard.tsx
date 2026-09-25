import { Link } from "@tanstack/react-router";
import { WEEKS, displayCity, type WTMEvent } from "@/lib/wtm-data";
import { EVENT_IMAGES } from "@/lib/event-images";
import { Calendar, MapPin, Users, CalendarPlus } from "lucide-react";

export function EventCard({ event }: { event: WTMEvent }) {
  const week = WEEKS[event.week];
  const d = new Date(event.date);
  // Times are stored as local event wall-clock times — render them as-is (UTC) so
  // cards match the event detail page regardless of the viewer's timezone.
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const img = event.image ?? EVENT_IMAGES[event.id];

  return (
    <article className="card-constellation group relative flex flex-col overflow-hidden rounded-2xl transition-all hover:border-primary/40 hover:shadow-glow-teal">
      <Link to="/event/$id" params={{ id: event.id }} className="relative block aspect-[16/9] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={event.title}
            loading="lazy"
            width={1280}
            height={800}
            className="h-full w-full object-cover opacity-85 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        <div className="absolute right-3 top-3">
          <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-widest shadow-sm backdrop-blur-sm ${week.tagClass}`}>
            {week.name}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <Calendar className="mr-1.5 inline h-3 w-3" />
          {dateStr} · {timeStr}
        </div>

        <Link to="/event/$id" params={{ id: event.id }} className="mt-3 block">
          <h3 className="font-display text-xl font-bold leading-tight transition-colors group-hover:text-primary">
            {event.title}
          </h3>
        </Link>

        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-primary" />
            {displayCity(event.city)}
          </span>
          <span>·</span>
          <span>{event.format.replace("-", " ")}</span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            {event.host}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-5">
          <Link to="/event/$id" params={{ id: event.id }} className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
            Details →
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={`/api/public/event/${event.id}/ics.ics`}
              onClick={(e) => e.stopPropagation()}
              download={`${event.id}.ics`}
              rel="external"
              aria-label={`Add ${event.title} to calendar`}
              title="Add to calendar"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface/40 px-2.5 py-1.5 text-xs font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
            </a>
            <a href={event.registrationUrl} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary hover:text-primary-foreground">
              Register
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
