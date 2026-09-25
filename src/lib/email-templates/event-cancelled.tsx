import * as React from 'react'
import { Heading, Hr, Link, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { ButtonLink, ExternalLinkIcon, Shell, styles } from './_shell'

interface SimilarEvent {
  title: string
  url: string
  when?: string
  location?: string
}

interface Props {
  firstName?: string
  title?: string
  when?: string
  location?: string
  hostOrg?: string
  similar?: SimilarEvent[]
  calendarUrl?: string
}

const Email = ({
  firstName = 'there',
  title = 'the event',
  when = '',
  location = '',
  hostOrg = '',
  similar = [],
  calendarUrl = 'https://witechmonth.com/calendar',
}: Props) => (
  <Shell preview={`${title} has been canceled`}>
    <Heading as="h1" style={styles.h1}>Event canceled</Heading>
    <Text style={styles.p}>Hi {firstName},</Text>
    <Text style={styles.p}>
      We're sorry to share that <strong>{title}</strong>
      {hostOrg ? <> hosted by {hostOrg}</> : null} has been canceled
      {when ? <> ({when})</> : null}. You don't need to do anything — your
      registration has been removed.
    </Text>
    {location ? (
      <Text style={styles.muted}>Originally scheduled at {location}.</Text>
    ) : null}

    {similar.length > 0 ? (
      <>
        <Hr style={{ borderColor: '#1F2937', margin: '24px 0' }} />
        <Heading as="h2" style={{ ...styles.h1, fontSize: '18px' }}>
          You might also like
        </Heading>
        <Text style={styles.muted}>
          Other Wisconsin Tech Month events happening soon:
        </Text>
        {similar.map((s, i) => (
          <Section key={i} style={{ marginTop: '12px' }}>
            <Text style={{ ...styles.p, margin: 0 }}>
              <Link href={s.url} style={styles.link}>
                <strong>{s.title}</strong>
              </Link>
            </Text>
            {(s.when || s.location) ? (
              <Text style={{ ...styles.muted, margin: '2px 0 0' }}>
                {[s.when, s.location].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </Section>
        ))}
      </>
    ) : null}

    <Section style={styles.buttonRow}>
      <ButtonLink href={calendarUrl}>
        <ExternalLinkIcon />
        Browse the full calendar
      </ButtonLink>
    </Section>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Canceled: ${d.title ?? 'your event'}`,
  displayName: 'Event canceled (registrant)',
  previewData: {
    firstName: 'Alex',
    title: 'MKE Founder Summit',
    when: 'Thursday, June 4, 2026 at 6:00 PM',
    location: 'Cream City Labs · Milwaukee, WI',
    hostOrg: 'Cream City Labs',
    calendarUrl: 'https://witechmonth.com/calendar',
    similar: [
      {
        title: 'Madison Startup Night',
        url: 'https://witechmonth.com/event/xyz',
        when: 'Tue, Jun 9 · 6:00 PM',
        location: 'StartingBlock · Madison, WI',
      },
      {
        title: 'WI AI Meetup',
        url: 'https://witechmonth.com/event/abc',
        when: 'Wed, Jun 10 · 5:30 PM',
        location: 'gener8tor · Milwaukee, WI',
      },
    ],
  },
} satisfies TemplateEntry
