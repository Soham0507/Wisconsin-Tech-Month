import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { Shell, styles, brand } from './_shell'

interface Props {
  siteName: string
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

export const MagicLinkEmail = ({ siteName, confirmationUrl }: Props) => (
  <Shell preview={`Your login link for ${siteName}`}>
    <Heading as="h1" style={styles.h1}>Your login link</Heading>
    <Text style={styles.p}>
      Click below to log in to {siteName}. This link expires shortly.
    </Text>
    <Text style={styles.p}>
      <Button style={button} href={confirmationUrl}>Log in</Button>
    </Text>
    <Text style={styles.muted}>
      If you didn't request this link, you can safely ignore this email.
    </Text>
  </Shell>
)

export default MagicLinkEmail
