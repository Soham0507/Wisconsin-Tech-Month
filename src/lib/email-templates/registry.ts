import type { ComponentType } from 'react'
import { template as submissionReceived } from './submission-received'
import { template as eventApproved } from './event-approved'
import { template as eventDenied } from './event-denied'
import { template as adminGranted } from './admin-granted'
import { template as registrationConfirmation } from './registration-confirmation'
import { template as eventCancelled } from './event-cancelled'
import { template as eventCancelledAdmin } from './event-cancelled-admin'
import { template as sponsorInquiry } from './sponsor-inquiry'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'submission-received': submissionReceived,
  'event-approved': eventApproved,
  'event-denied': eventDenied,
  'admin-granted': adminGranted,
  'registration-confirmation': registrationConfirmation,
  'event-cancelled': eventCancelled,
  'event-cancelled-admin': eventCancelledAdmin,
  'sponsor-inquiry': sponsorInquiry,
}
