import type { WTMEvent } from "./wtm-data";

function pad(n: number) { return String(n).padStart(2, "0"); }

/**
 * Event times are stored as bare wall-clock values (the UI renders them with
 * timeZone: "UTC"), so ICS output must carry the same digits anchored to the
 * event's local zone — never as a `Z` (UTC) instant, which calendar clients
 * would shift by the viewer's offset.
 */
export const EVENT_TZID = "America/Chicago";

export function toIcsLocalDate(iso: string) {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00"
  );
}

function toIcsUtcDate(iso: string) {
  return `${toIcsLocalDate(iso)}Z`;
}

export const VTIMEZONE_CENTRAL = [
  "BEGIN:VTIMEZONE",
  `TZID:${EVENT_TZID}`,
  "X-LIC-LOCATION:America/Chicago",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0500",
  "TZNAME:CDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcs(event: WTMEvent): string {
  const start = toIcsLocalDate(event.date);
  const endIso = event.endDate ?? new Date(new Date(event.date).getTime() + 60 * 60 * 1000).toISOString();
  const end = toIcsLocalDate(endIso);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WTM2026//EN",
    "CALSCALE:GREGORIAN",
    ...VTIMEZONE_CENTRAL,
    "BEGIN:VEVENT",
    `UID:${event.id}@witechmonth.com`,
    `DTSTAMP:${toIcsUtcDate(new Date().toISOString())}`,
    `DTSTART;TZID=${EVENT_TZID}:${start}`,
    `DTEND;TZID=${EVENT_TZID}:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(`${event.venue}, ${event.address}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcs(event: WTMEvent) {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
