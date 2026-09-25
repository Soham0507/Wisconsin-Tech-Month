import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import type { Database } from '@/integrations/supabase/types'

function pad(n: number) { return String(n).padStart(2, '0') }
/** Stored times are bare wall-clock values (UI renders them as UTC digits). */
function toIcsLocalDate(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
}
function toIcsDate(iso: string) {
  return `${toIcsLocalDate(iso)}Z`
}
const TZID = 'America/Chicago'
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  'X-LIC-LOCATION:America/Chicago',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0500',
  'TZNAME:CDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0600',
  'TZNAME:CST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]
function escapeIcs(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

export const Route = createFileRoute('/api/public/event/$id/ics.ics')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = process.env.SUPABASE_URL
        const key = process.env.SUPABASE_PUBLISHABLE_KEY
        if (!url || !key) {
          return new Response('Server misconfigured', { status: 500 })
        }
        const supabase = createClient<Database>(url, key, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        })
        const { data, error } = await supabase
          .from('events_public')
          .select('id, title, description, starts_at, ends_at, venue, address, status')
          .eq('id', params.id)
          .eq('status', 'approved')
          .maybeSingle()

        if (error || !data) {
          return new Response('Not found', { status: 404 })
        }

        const start = data.starts_at ?? new Date().toISOString()
        const end = data.ends_at ?? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString()
        const ics = [
          'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WTM2026//EN', 'CALSCALE:GREGORIAN',
          ...VTIMEZONE,
          'BEGIN:VEVENT',
          `UID:${data.id}@witechmonth.com`,
          `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
          `DTSTART;TZID=${TZID}:${toIcsLocalDate(start)}`,
          `DTEND;TZID=${TZID}:${toIcsLocalDate(end)}`,
          `SUMMARY:${escapeIcs(data.title ?? '')}`,
          `DESCRIPTION:${escapeIcs(data.description ?? '')}`,
          `LOCATION:${escapeIcs([data.venue, data.address].filter(Boolean).join(', '))}`,
          'END:VEVENT', 'END:VCALENDAR',
        ].join('\r\n')

        return new Response(ics, {
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${data.id}.ics"`,
            'Cache-Control': 'public, max-age=300',
          },
        })
      },
    },
  },
})
