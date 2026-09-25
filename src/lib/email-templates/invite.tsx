import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { Shell, styles, brand } from './_shell'

interface Props {
  siteName: string
  siteUrl: string
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

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: Props) => (
  <Shell hero preview={`You've been invited to join ${siteName}`}>
    <Heading as="h1" style={styles.h1}>You've been invited</Heading>
    <Text style={styles.p}>
      You've been invited to join{' '}
      <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>.
    </Text>
    <Text style={styles.p}>
      <Button style={button} href={confirmationUrl}>Accept invitation</Button>
    </Text>
    <Text style={styles.muted}>
      If you weren't expecting this invitation, you can safely ignore this email.
    </Text>
  </Shell>
)

export default InviteEmail
