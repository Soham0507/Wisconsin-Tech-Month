import * as React from 'react'
import { Heading, Link, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, styles } from './_shell'

interface Props {
  name?: string
  company?: string
  email?: string
  tierInterest?: string | null
  budgetRange?: string | null
  cityFocus?: string | null
  interests?: string[]
  message?: string | null
}

const row: React.CSSProperties = { margin: '6px 0', fontSize: 14, lineHeight: '20px', color: '#F8FAFC' }
const label: React.CSSProperties = { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }

const Email = ({
  name = 'Someone',
  company = '—',
  email = '',
  tierInterest,
  budgetRange,
  cityFocus,
  interests = [],
  message,
}: Props) => (
  <Shell preview={`New sponsor inquiry from ${company}`}>
    <Heading as="h1" style={styles.h1}>New sponsor inquiry</Heading>
    <Text style={styles.p}>
      <strong>{name}</strong> from <strong>{company}</strong> just submitted the sponsor form on witechmonth.com.
    </Text>

    <div style={{ marginTop: 20 }}>
      <div style={label}>Reply to</div>
      <div style={row}>
        {email ? <Link href={`mailto:${email}`} style={styles.link}>{email}</Link> : '—'}
      </div>

      <div style={{ ...label, marginTop: 14 }}>Tier interest</div>
      <div style={row}>{tierInterest || '—'}</div>

      <div style={{ ...label, marginTop: 14 }}>Budget range</div>
      <div style={row}>{budgetRange || '—'}</div>

      <div style={{ ...label, marginTop: 14 }}>City focus</div>
      <div style={row}>{cityFocus || '—'}</div>

      <div style={{ ...label, marginTop: 14 }}>Interests</div>
      <div style={row}>{interests.length ? interests.join(', ') : '—'}</div>

      <div style={{ ...label, marginTop: 14 }}>Message</div>
      <div style={{ ...row, whiteSpace: 'pre-wrap' }}>{message || '—'}</div>
    </div>
  </Shell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New sponsor inquiry — ${d.company ?? 'unknown company'}`,
  displayName: 'Sponsor inquiry (internal)',
  previewData: {
    name: 'Alex Anderson',
    company: 'Acme Corp',
    email: 'alex@acme.com',
    tierInterest: 'Gold',
    budgetRange: '$10k–$25k',
    cityFocus: 'Milwaukee',
    interests: ['Presenting', 'In-kind'],
    message: 'Excited to explore a partnership for WTM 2026.',
  },
} satisfies TemplateEntry
