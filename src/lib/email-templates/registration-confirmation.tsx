import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { ButtonLink, CalendarIcon, ExternalLinkIcon, Shell, styles } from './_shell'

interface Props {
  firstName?: string
  title?: string
  when?: string
  location?: string
  description?: string
  eventUrl?: string
  icsUrl?: string
  imageUrl?: string
}

const Email = ({
  firstName = 'there',
  title = 'the event',
  when = 'TBA',
  location = '',
  description = '',
  eventUrl = 'https://witechmonth.com',
  icsUrl,
  imageUrl,
}: Props) => (
  <Shell
    hero={!imageUrl}
    heroSrc={imageUrl}
    heroAlt={imageUrl ? title : undefined}
    preview={`You're registered for ${title}`}
  >
    <Heading as="h1" style={styles.h1}>You're in, {firstName}!</Heading>
    <Text style={styles.p}>
      See you at <strong>{title}</strong>.
    </Text>
    <Text style={styles.muted}>
      {when}
      {location ? <><br />{location}</> : null}
    </Text>
    {description ? <Text style={styles.p}>{description}</Text> : null}
    <Section style={styles.buttonRow}>
      <ButtonLink href={eventUrl}>
        <ExternalLinkIcon />
        View event
      </ButtonLink>
    </Section>
    {icsUrl ? (
      <Section style={styles.buttonRow}>
        <ButtonLink href={icsUrl} variant="secondary">
          <CalendarIcon />
          Add to calendar
        </ButtonLink>
      </Section>
    ) : null}
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `You're registered: ${d.title ?? 'your event'}`,
  displayName: 'Registration confirmation',
  previewData: {
    firstName: 'Alex',
    title: 'MKE Founder Summit',
    when: 'Thursday, June 4, 2026 at 6:00 PM',
    location: 'Cream City Labs · 1433 N Water St, Milwaukee, WI',
    description: 'An evening of talks and networking with Wisconsin founders.',
    eventUrl: 'https://witechmonth.com/event/abc',
    icsUrl: 'https://witechmonth.com/api/public/event/abc/ics.ics',
  },
} satisfies TemplateEntry
