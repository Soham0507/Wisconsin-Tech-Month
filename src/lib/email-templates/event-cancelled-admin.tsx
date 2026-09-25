import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, styles } from './_shell'

interface Props {
  title?: string
  hostName?: string
  hostEmail?: string
  hostOrg?: string
  when?: string
  location?: string
  registrantCount?: number
  adminUrl?: string
}

const Email = ({
  title = 'an event',
  hostName = 'the host',
  hostEmail = '',
  hostOrg = '',
  when = '',
  location = '',
  registrantCount = 0,
  adminUrl = 'https://witechmonth.com/admin',
}: Props) => (
  <Shell preview={`${title} was deleted by its host`}>
    <Heading as="h1" style={styles.h1}>Event deleted by host</Heading>
    <Text style={styles.p}>
      <strong>{title}</strong> was just deleted by the host.
    </Text>
    <Text style={styles.muted}>
      Host: {hostName}{hostEmail ? ` (${hostEmail})` : ''}{hostOrg ? ` — ${hostOrg}` : ''}
      {when ? <><br />When: {when}</> : null}
      {location ? <><br />Where: {location}</> : null}
      <br />
      Registrants notified: {registrantCount}
    </Text>
    <Text style={styles.p}>
      The event has been removed from the calendar. Registrants were emailed a
      cancellation notice with links to similar upcoming events.
    </Text>
    <Text style={styles.muted}>
      Review activity in the <a href={adminUrl} style={styles.link}>admin console</a>.
    </Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `[WTM] Host deleted event: ${d.title ?? 'untitled'}`,
  displayName: 'Event deleted (admin notice)',
  previewData: {
    title: 'MKE Founder Summit',
    hostName: 'Jamie Rivera',
    hostEmail: 'jamie@example.com',
    hostOrg: 'Cream City Labs',
    when: 'Thursday, June 4, 2026 at 6:00 PM',
    location: 'Cream City Labs · Milwaukee, WI',
    registrantCount: 42,
    adminUrl: 'https://witechmonth.com/admin',
  },
} satisfies TemplateEntry
