import * as React from 'react'
import { Heading, Link, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, styles } from './_shell'

interface Props {
  title?: string
  reason?: string
  editUrl?: string
}

const Email = ({
  title = 'your event',
  reason = '',
  editUrl = 'https://witechmonth.com/host/submit',
}: Props) => (
  <Shell preview={`Feedback on your submission: ${title}`}>
    <Heading as="h1" style={styles.h1}>A reviewer sent feedback</Heading>
    <Text style={styles.p}>
      <strong>{title}</strong> needs some updates before it can go live.
    </Text>
    {reason ? <Text style={styles.quote}>{reason}</Text> : null}
    <Text style={styles.p}>
      <Link href={editUrl} style={styles.link}>Edit and resubmit →</Link>
    </Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Needs changes: "${d.title ?? 'your event'}"`,
  displayName: 'Event needs changes',
  previewData: {
    title: 'MKE Founder Summit',
    reason: 'Please add a venue address and a clearer description of the audience.',
    editUrl: 'https://witechmonth.com/host/submit?id=abc',
  },
} satisfies TemplateEntry
