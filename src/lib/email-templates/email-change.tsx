import * as React from 'react'
import { Button, Heading, Link, Text } from '@react-email/components'
import { Shell, styles, brand } from './_shell'

interface Props {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
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

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: Props) => (
  <Shell preview={`Confirm your email change for ${siteName}`}>
    <Heading as="h1" style={styles.h1}>Confirm your email change</Heading>
    <Text style={styles.p}>
      You requested to change your {siteName} email from{' '}
      <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link> to{' '}
      <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
    </Text>
    <Text style={styles.p}>
      <Button style={button} href={confirmationUrl}>Confirm email change</Button>
    </Text>
    <Text style={styles.muted}>
      If you didn't request this change, secure your account immediately.
    </Text>
  </Shell>
)

export default EmailChangeEmail
