import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const LOGO_URL =
  'https://witechmonth.com/__l5e/assets-v1/fbf52451-3c7e-4050-afbd-c871d171c517/wtm-logo-white.png'
export const HERO_URL =
  'https://witechmonth.com/__l5e/assets-v1/1705308f-e8ce-4a99-a243-60d8bc52ef04/email-wisconsin-hero.jpg'


export const brand = {
  bg: '#ffffff',
  card: '#0F172A',
  cardBorder: '#1F2937',
  text: '#F8FAFC',
  muted: '#94A3B8',
  accent: '#5EEAD4',
  quote: '#CBD5F5',
}

const main = {
  backgroundColor: brand.bg,
  fontFamily: 'Inter, Arial, sans-serif',
  margin: 0,
  padding: '24px 12px',
}

const card = {
  maxWidth: '560px',
  margin: '0 auto',
  background: brand.card,
  border: `1px solid ${brand.cardBorder}`,
  borderRadius: '16px',
  padding: '32px',
  color: brand.text,
}

const eyebrow = {
  fontFamily: '"Archivo Black", Arial, sans-serif',
  fontSize: '18px',
  color: brand.accent,
  margin: '0 0 8px 0',
  letterSpacing: '0.02em',
}

const footer = {
  marginTop: '32px',
  fontSize: '12px',
  color: brand.muted,
}

interface Props {
  preview: string
  children: React.ReactNode
  hero?: boolean
  heroSrc?: string
  heroAlt?: string
}

export function Shell({ preview, children, hero = false, heroSrc, heroAlt }: Props) {
  const showHero = hero || !!heroSrc
  const src = heroSrc || HERO_URL
  const alt = heroAlt || 'Wisconsin Tech Month constellation'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={card}>
          <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Img
              src={LOGO_URL}
              alt="Wisconsin Tech Month"
              width="140"
              height="auto"
              style={{ margin: '0 auto', display: 'block' }}
            />
          </Section>
          {showHero ? (
            <Section style={{ marginBottom: '24px' }}>
              <Img
                src={src}
                alt={alt}
                width="520"
                height="260"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: '520px',
                  height: 'auto',
                  margin: '0 auto',
                  borderRadius: '12px',
                  border: `1px solid ${brand.cardBorder}`,
                  objectFit: 'cover',
                }}
              />
            </Section>
          ) : null}
          <Text style={eyebrow}>Wisconsin Tech Month 2026</Text>
          {children}
          <Text style={footer}>witechmonth.com</Text>
        </Container>
      </Body>
    </Html>
  )
}


export const styles = {
  h1: { fontSize: '20px', margin: '0 0 12px 0', color: brand.text },
  p: { fontSize: '15px', lineHeight: '22px', color: brand.text, margin: '0 0 12px 0' },
  muted: { fontSize: '14px', color: brand.muted, margin: '0 0 12px 0' },
  link: { color: brand.accent, textDecoration: 'none' },
  quote: {
    borderLeft: `3px solid ${brand.accent}`,
    padding: '12px 16px',
    background: '#0B1220',
    color: brand.quote,
    fontSize: '15px',
    lineHeight: '22px',
    borderRadius: '8px',
    margin: '12px 0',
  },
  buttonPrimary: {
    backgroundColor: brand.accent,
    color: '#0B1220',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: '20px',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: brand.accent,
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: '20px',
    border: `1px solid ${brand.accent}`,
  },
  buttonRow: { margin: '20px 0', textAlign: 'center' as const },
  buttonIcon: {
    display: 'inline-block',
    verticalAlign: 'middle',
    marginRight: '8px',
    width: '16px',
    height: '16px',
  },
}

export function ButtonLink({
  href,
  variant = 'primary',
  children,
}: {
  href: string
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}) {
  const style = variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary
  return (
    <Button href={href} style={style}>
      {children}
    </Button>
  )
}

export function CalendarIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ ...styles.buttonIcon, ...style }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

export function ExternalLinkIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ ...styles.buttonIcon, ...style }}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
