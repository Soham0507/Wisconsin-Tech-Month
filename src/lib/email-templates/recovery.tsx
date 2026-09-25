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

export const RecoveryEmail = ({ siteName, confirmationUrl }: Props) => (
  <Shell preview={`Reset your password for ${siteName}`}>
    <Heading as="h1" style={styles.h1}>Reset your password</Heading>
    <Text style={styles.p}>
      We got a request to reset your password for {siteName}. Choose a new one below.
    </Text>
    <Text style={styles.p}>
      <Button style={button} href={confirmationUrl}>Reset password</Button>
    </Text>
    <Text style={styles.muted}>
      If you didn't request a password reset, you can safely ignore this email — your password won't change.
    </Text>
  </Shell>
)

export default RecoveryEmail
