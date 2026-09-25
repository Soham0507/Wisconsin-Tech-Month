import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Shell, styles, brand } from './_shell'

interface Props {
  token: string
}

const code = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  letterSpacing: '0.35em',
  color: brand.accent,
  background: '#0B1220',
  padding: '16px 20px',
  borderRadius: '10px',
  textAlign: 'center' as const,
  margin: '8px 0 20px',
}

export const ReauthenticationEmail = ({ token }: Props) => (
  <Shell preview="Your Wisconsin Tech Month verification code">
    <Heading as="h1" style={styles.h1}>Confirm it's you</Heading>
    <Text style={styles.p}>Use the code below to confirm your identity:</Text>
    <Text style={code}>{token}</Text>
    <Text style={styles.muted}>
      This code expires shortly. If you didn't request this, you can safely ignore this email.
    </Text>
  </Shell>
)

export default ReauthenticationEmail
