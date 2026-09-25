import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { Shell, styles, brand } from './_shell'

interface Props {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const button = {
  background: brand.accent,
  color: '#0F172A',
  fontSize: '14px',
  fontWeight: 700,
  borderRadius: '10px',
  padding: '12px 20px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const SignupEmail = ({ siteUrl, recipient, confirmationUrl }: Props) => (
  <Shell hero preview="Confirm your Wisconsin Tech Month host account">
    <Heading as="h1" style={styles.h1}>Confirm your host account</Heading>
    <Text style={styles.p}>
      Welcome to <Link href={siteUrl} style={styles.link}><strong>witechmonth.com</strong></Link> — Wisconsin's
      statewide celebration of tech, startups, and community.
    </Text>
    <Text style={styles.p}>
      Confirm <strong>{recipient}</strong> to activate your host account and start submitting events for
      Wisconsin Tech Month 2026.
    </Text>
    <Text style={styles.p}>
      <Button style={button} href={confirmationUrl}>Confirm host account</Button>
    </Text>
    <Text style={styles.p}>
      As a host you can:
    </Text>
    <Text style={styles.p}>
      • Submit meetups, workshops, panels, demos, and networking events across Wisconsin<br />
      • Track submissions and approvals from your host dashboard<br />
      • Reach founders, engineers, students, and investors during the month-long celebration
    </Text>
    <Text style={styles.muted}>
      All submissions are reviewed by the Wisconsin Tech Month team before going live on the calendar
      at witechmonth.com.
    </Text>
    <Text style={styles.muted}>
      If you didn't create a host account, you can safely ignore this email.
    </Text>
  </Shell>
)

export default SignupEmail
