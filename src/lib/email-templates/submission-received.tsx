import * as React from 'react'
import { Heading, Link, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, styles } from './_shell'

interface Props {
  title?: string
  dashboardUrl?: string
}

const Email = ({ title = 'your event', dashboardUrl = 'https://witechmonth.com/host/dashboard' }: Props) => (
  <Shell hero preview={`We received your submission: ${title}`}>
    <Heading as="h1" style={styles.h1}>We got your submission</Heading>
    <Text style={styles.p}>
      Thanks for submitting <strong>{title}</strong>. Our reviewers will get back to you within two business days.
    </Text>
    <Text style={styles.p}>
      <Link href={dashboardUrl} style={styles.link}>Open your dashboard →</Link>
    </Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Received: "${d.title ?? 'your event'}"`,
  displayName: 'Submission received',
  previewData: { title: 'MKE Founder Summit', dashboardUrl: 'https://witechmonth.com/host/dashboard' },
} satisfies TemplateEntry
