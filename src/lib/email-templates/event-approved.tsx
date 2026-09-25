import * as React from 'react'
import { Heading, Link, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, styles } from './_shell'

interface Props {
  title?: string
  eventUrl?: string
  dashboardUrl?: string
}

const Email = ({
  title = 'your event',
  eventUrl = 'https://witechmonth.com',
  dashboardUrl = 'https://witechmonth.com/host/dashboard',
}: Props) => (
  <Shell hero preview={`${title} is live on the WTM 2026 calendar`}>
    <Heading as="h1" style={styles.h1}>Your event is live 🎉</Heading>
    <Text style={styles.p}>
      <strong>{title}</strong> has been approved and is now on the WTM 2026 calendar.
    </Text>
    <Text style={styles.p}>
      <Link href={eventUrl} style={styles.link}>View your event page →</Link>
    </Text>
    <Text style={styles.muted}>
      <Link href={dashboardUrl} style={{ color: '#94A3B8', textDecoration: 'none' }}>
        Manage in your dashboard
      </Link>
    </Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Approved: "${d.title ?? 'your event'}" is live`,
  displayName: 'Event approved',
  previewData: {
    title: 'MKE Founder Summit',
    eventUrl: 'https://witechmonth.com/event/abc',
    dashboardUrl: 'https://witechmonth.com/host/dashboard',
  },
} satisfies TemplateEntry
