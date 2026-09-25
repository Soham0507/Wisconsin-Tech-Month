import * as React from "react";
import { render } from "@react-email/render";
import type { Database } from "@/integrations/supabase/types";
import { TEMPLATES } from "./email-templates/registry";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

const SITE_NAME = "Wisconsin Tech Month";
const SENDER_DOMAIN = "notify.witechmonth.com";
const FROM_DOMAIN = "witechmonth.com";
const APP_URL =
  process.env.APP_PUBLIC_URL || "https://witechmonth.com";

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUnsubscribeToken(
  supabase: any,
  email: string,
): Promise<string | null> {
  const normalized = email.toLowerCase();
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) return existing.token;
  if (existing?.used_at) return null; // already unsubscribed
  const token = randomToken();
  await supabase
    .from("email_unsubscribe_tokens")
    .upsert(
      { token, email: normalized },
      { onConflict: "email", ignoreDuplicates: true },
    );
  const { data: stored } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (!stored || stored.used_at) return null;
  return stored.token;
}

async function enqueueTemplate(
  templateName: string,
  recipientEmail: string | undefined,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
) {
  if (!recipientEmail) return;
  const tpl = TEMPLATES[templateName];
  if (!tpl) {
    console.error("[email] unknown template", templateName);
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const messageId = crypto.randomUUID();
  const normalized = recipientEmail.toLowerCase();

  // Suppression check
  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (suppressed) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipientEmail,
      status: "suppressed",
    });
    return;
  }

  const unsubscribeToken = await getUnsubscribeToken(supabaseAdmin, recipientEmail);
  if (!unsubscribeToken) {
    console.warn("[email] unsubscribe token unavailable, skipping", templateName);
    return;
  }

  const element = React.createElement(tpl.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof tpl.subject === "function" ? tpl.subject(templateData) : tpl.subject;

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientEmail,
    status: "pending",
  });

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) {
    console.error("[email] enqueue failed", templateName, error);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipientEmail,
      status: "failed",
      error_message: "enqueue failed",
    });
  }
}

export async function sendSubmissionReceived(email: string | undefined, title: string, eventId?: string) {
  await enqueueTemplate(
    "submission-received",
    email,
    { title, dashboardUrl: `${APP_URL}/host/dashboard` },
    `submission-received:${eventId ?? title}`,
  );
}

export async function sendApproved(email: string | undefined, title: string, id: string) {
  await enqueueTemplate(
    "event-approved",
    email,
    {
      title,
      eventUrl: `${APP_URL}/event/${id}`,
      dashboardUrl: `${APP_URL}/host/dashboard`,
    },
    `event-approved:${id}`,
  );
}

export async function sendDenied(email: string | undefined, title: string, id: string, reason: string) {
  await enqueueTemplate(
    "event-denied",
    email,
    {
      title,
      reason,
      editUrl: `${APP_URL}/host/submit?id=${id}`,
    },
    `event-denied:${id}:${Date.now()}`,
  );
}

export async function sendAdminGranted(email: string) {
  await enqueueTemplate(
    "admin-granted",
    email,
    { adminUrl: `${APP_URL}/admin` },
    `admin-granted:${email.toLowerCase()}`,
  );
}

export async function sendRegistrationConfirmation(email: string, name: string, ev: EventRow) {
  const firstName = (name || "").split(" ")[0] || "there";
  const when = ev.starts_at
    ? new Date(ev.starts_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" })
    : "TBA";
  const location = [ev.venue, ev.address].filter(Boolean).join(" · ");
  await enqueueTemplate(
    "registration-confirmation",
    email,
    {
      firstName,
      title: ev.title,
      when,
      location,
      description: ev.description ?? "",
      eventUrl: `${APP_URL}/event/${ev.id}`,
      icsUrl: `${APP_URL}/api/public/event/${ev.id}/ics.ics`,
      imageUrl: ev.image_url ?? undefined,
    },
    `registration:${ev.id}:${email.toLowerCase()}`,
  );
}

type SimilarEvent = { title: string; url: string; when?: string; location?: string };

export async function sendEventCancelledToRegistrant(
  email: string,
  name: string | null,
  ev: EventRow,
  similar: SimilarEvent[],
) {
  const firstName = (name || "").split(" ")[0] || "there";
  const when = ev.starts_at
    ? new Date(ev.starts_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" })
    : "";
  const location = [ev.venue, ev.address].filter(Boolean).join(" · ");
  await enqueueTemplate(
    "event-cancelled",
    email,
    {
      firstName,
      title: ev.title,
      when,
      location,
      hostOrg: ev.host_org ?? "",
      similar,
      calendarUrl: `${APP_URL}/calendar`,
    },
    `event-cancelled:${ev.id}:${email.toLowerCase()}`,
  );
}

export async function sendEventCancelledToAdmin(
  adminEmail: string,
  ev: EventRow,
  hostName: string,
  hostEmail: string,
  registrantCount: number,
) {
  const when = ev.starts_at
    ? new Date(ev.starts_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" })
    : "";
  const location = [ev.venue, ev.address].filter(Boolean).join(" · ");
  await enqueueTemplate(
    "event-cancelled-admin",
    adminEmail,
    {
      title: ev.title,
      hostName,
      hostEmail,
      hostOrg: ev.host_org ?? "",
      when,
      location,
      registrantCount,
      adminUrl: `${APP_URL}/admin`,
    },
    `event-cancelled-admin:${ev.id}:${adminEmail.toLowerCase()}`,
  );
}

export async function sendSponsorInquiry(
  inquiryId: string,
  data: {
    name: string;
    company: string;
    email: string;
    tierInterest?: string | null;
    budgetRange?: string | null;
    cityFocus?: string | null;
    interests?: string[];
    message?: string | null;
  },
) {
  await enqueueTemplate(
    "sponsor-inquiry",
    "Nadiyah@jetconstellations.com",
    {
      name: data.name,
      company: data.company,
      email: data.email,
      tierInterest: data.tierInterest ?? null,
      budgetRange: data.budgetRange ?? null,
      cityFocus: data.cityFocus ?? null,
      interests: data.interests ?? [],
      message: data.message ?? null,
    },
    `sponsor-inquiry:${inquiryId}`,
  );
}
