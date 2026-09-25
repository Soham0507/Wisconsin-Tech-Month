import * as React from 'react'
import { Heading, Link, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, styles } from './_shell'

interface Props {
  adminUrl?: string
}

const Email = ({ adminUrl = 'https://witechmonth.com/admin' }: Props) => (
  <Shell hero preview="You now have WTM admin access">
    <Heading as="h1" style={styles.h1}>You have admin access</Heading>
    <Text style={styles.p}>
      You can now review event submissions, manage the calendar, and view analytics.
    </Text>
    <Text style={styles.p}>
      <Link href={adminUrl} style={styles.link}>Open the admin dashboard →</Link>
    </Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: "You're now a WTM admin",
  displayName: 'Admin access granted',
  previewData: { adminUrl: 'https://witechmonth.com/admin' },
} satisfies TemplateEntry
