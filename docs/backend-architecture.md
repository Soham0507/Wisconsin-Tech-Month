# Backend & Database Architecture — Wisconsin Tech Month 2026

*File:line citations point to source files in the project repository.*

## 1. Overall Stack & Deployment Model

| Layer | Technology |
|---|---|
| Framework | **TanStack Start** (full-stack React, file-based routing) |
| Build tool | **Vite** |
| Server runtime | **Nitro** / Cloudflare Workers edge — SSR for every public page |
| Hosting | **Lovable Cloud** |
| Database & Auth | **Supabase** (PostgreSQL + GoTrue auth) |
| Email delivery | **Resend** via `connector-gateway.lovable.dev/resend` |
| Image assets | Static bundled JPGs + hosted `image_url` strings per event |

**SSR approach:** Public routes are server-rendered on demand. The authenticated admin/host routes opt out of SSR (`ssr: false`) so they run client-side only after a session check.

*References: `vite.config.ts`, `src/start.ts`, `src/routes/_authenticated/route.tsx`*

## 2. Database Tables

All tables live in the `public` schema of Supabase. RLS is enabled on every table.

### `profiles`

Lightweight user display record, auto-created on signup. Also stores host-organization defaults so hosts don't re-enter info on every event submission.

- `id` UUID PK = `auth.users.id`
- `display_name`, `host_org`, `host_url`, `host_org_type`
- `host_email`, `host_contact_name`, `host_contact_phone`, `host_contact_role`, `host_logo_url`
- `created_at`, `updated_at`

### `events`

Core event table with review lifecycle.

- `organizer_id` → `auth.users.id`
- `status`: `draft`, `pending`, `approved`, `denied`
- `path`: `internal` (RSVP on-site) or `external` (link-out)
- `format`: `in-person`, `virtual`, `hybrid`
- `title`, `description`, `week` (`w1`–`w4`), `city`, `region`, `venue`, `address`, `starts_at`, `ends_at`, `capacity`, `cost_cents`, `external_url`, `topics`, `audience`, `image_url`, `host_logo_url`, `denial_reason`, `admin_note`, `published_at`, `resubmitted_at`

### `event_registrations`

RSVP records for `internal` events. Unique on `(event_id, email)`.

- `event_id` → `events.id`, `user_id` → `auth.users.id` (nullable), `name`, `email`, `created_at`

### `event_clicks`

Click-through tracking for `external` events.

- `event_id` → `events.id`, `referrer`, `created_at`

### `page_views`

First-party analytics for public visitor pages.

- `path`, `session_id`, `referrer`, `user_id`, `viewed_at`

### `sponsor_inquiries`

Contact form submissions from prospective sponsors.

- `name`, `company`, `email`, `interests`, `tier_interest`, `budget_range`, `city_focus`, `message`

### `user_roles`

Role grants. `app_role` enum: `admin`, `moderator`, `organizer`. Only `admin` is actively enforced today.

- `user_id` → `auth.users.id`, `role`, `created_at`

### `pending_admin_invites`

Queue of email addresses that should become admins on first signup. Consumed automatically by a database trigger when the user signs up.

- `email` PK, `invited_by` → `auth.users.id`, `created_at`

## 3. Authentication Flow

- **Email/password:** sign-up and sign-in via Supabase at `/auth`. Sign-up requires email confirmation.
- **Google OAuth:** via `lovable.auth.signInWithOAuth("google", ...)` through the Lovable Cloud OAuth proxy.
- **Password reset:** magic-link flow to `/reset-password`.
- **Session handling:** browser client persists session in `localStorage` with auto-refresh. A global middleware attaches the bearer token to every server function call; the server validates it via `requireSupabaseAuth`.
- **Route guard:** `/_authenticated` layout checks `supabase.auth.getUser()` client-side and redirects to `/auth` if needed.
- **Auth state sync:** root component listens to `onAuthStateChange` and invalidates the router on identity transitions.

*References: `src/routes/auth.tsx`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/auth-attacher.ts`, `src/integrations/supabase/auth-middleware.ts`, `src/routes/_authenticated/route.tsx`, `src/routes/__root.tsx`*

## 4. User Roles & Admin System

- **`has_role(user_id, role)`** — SECURITY DEFINER function used inside RLS policies to check admin status without creating recursive RLS loops.
- **Admin gate in server functions** — every admin function calls `has_role(ctx.userId, 'admin')` and throws `Forbidden` if false.
- **Admin invite flow** — an existing admin calls `grantAdminByEmail`. If the user exists, the role is granted immediately; otherwise a `pending_admin_invites` row is inserted and Supabase sends a magic-link invite. A trigger on signup converts the pending invite into a role grant.
- **Bootstrap admin** — one initial admin email is seeded in a migration.

*References: `src/lib/admins.functions.ts`, relevant migrations*

## 5. Server Functions Pattern

TanStack Start compiles `createServerFn` exports into HTTP RPC endpoints handled by Nitro.

### Public (no auth) functions

Create a server publishable Supabase client with no user token, operating under the `anon` RLS role. Used for: listing approved events, event detail, registrations, clicks, sponsor inquiries, page-view tracking, analytics reads.

### Authenticated functions

Use `.middleware([requireSupabaseAuth])`. The middleware validates the JWT and injects a Supabase client carrying the user's token, so queries run under RLS as the authenticated user.

### Admin service-role client (`supabaseAdmin`)

Lazy singleton using `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS. Used only for privileged operations: looking up another user's email, paginating auth users, sending Supabase invites. It is **never imported at module scope** of route or `.functions.ts` files; always loaded dynamically inside a server handler.

*References: `src/integrations/supabase/client.server.ts`, `src/lib/events.functions.ts`, `src/lib/admins.functions.ts`, `src/lib/registration.functions.ts`, `src/lib/analytics.functions.ts`, `src/lib/sponsor.functions.ts`, `src/start.ts`*

## 6. Key Backend Features

### Event management

- Hosts submit events at `/host/submit`; events land as `pending`.
- Admins review at `/admin/queue` with `approveEvent`/`denyEvent`.
- Denied organizers can resubmit; server records `resubmitted_at`.
- Admins can also directly create/edit/delete events.

### Event registrations (internal events)

Any visitor can RSVP to an `approved + internal` event. Capacity is checked before insert; duplicate email per event is blocked. A confirmation email with `.ics` calendar attachment is sent.

### Event clicks (external events)

`logEventClick` records a click whenever a user is sent to an external URL. RLS ensures it only works for approved external events.

### Sponsor inquiries

Public server function with Zod validation on the server and RLS `WITH CHECK` constraints at the database.

### Page-view analytics

`trackPageView` is called on every public client navigation. Session IDs are random strings stored in `localStorage`. The admin analytics dashboard aggregates daily trends, top pages, top referrers, and registration trends.

### Email sending (Resend via Lovable gateway)

All transactional emails go through `src/lib/email.server.ts`, which POSTs to the Lovable Resend gateway. Emails include: submission received, approved, denied, registration confirmation (with `.ics`), and admin granted.

### Image storage

Event images are stored as external URL strings. Seed data uses bundled static JPGs. No Supabase Storage bucket is in use yet.

### Host profile defaults

Hosts can save organization info to `profiles` so it pre-fills new event submissions.

### Sitemap

`GET /sitemap.xml` generates an XML sitemap from static paths plus seed events.

*References: `src/lib/events.functions.ts`, `src/lib/registration.functions.ts`, `src/lib/email.server.ts`, `src/lib/analytics.functions.ts`, `src/lib/sponsor.functions.ts`, `src/lib/profile.functions.ts`, `src/routes/sitemap[.]xml.ts`, `src/routes/__root.tsx`*

## 7. Security Model

### Row-Level Security summary

| Table | INSERT | SELECT | UPDATE/DELETE |
|---|---|---|---|
| `profiles` | Owner | Owner | Owner |
| `events` | Organizer | anon (approved) / organizer (own) / admin (all) | Organizer (own) / admin |
| `event_registrations` | Anyone (approved+internal) | Organizer (own event) / admin | Registrant (own) / organizer / admin |
| `event_clicks` | Anyone (approved+external) | Organizer (own event) / admin | — |
| `page_views` | anon + authenticated (validated) | Admin | — |
| `sponsor_inquiries` | anon + authenticated (validated) | Admin | — |
| `user_roles` | Admin only | Own row / admin | Delete only via server function |
| `pending_admin_invites` | Admin only | Admin only | Admin only |

### Security definer functions

- `has_role()` — role checks inside RLS policies.
- `handle_new_user()` — auto-creates `profiles` row on signup.
- `apply_pending_admin_invite()` — grants admin and clears invite on signup.
- `tg_set_updated_at()` — updates `updated_at` timestamps.

Trigger-support functions have `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated`; they run only as database triggers.

### Defense in depth

1. Zod `inputValidator` in every server function.
2. RLS `WITH CHECK` clauses on every writable table.
3. Database constraints: unique indexes, FKs, enum types.

### Notable patterns

- `supabaseAdmin` is never in the client bundle and is always dynamically imported.
- `requireSupabaseAuth` validates JWT signature and claims before forwarding.
- `anon` grants are as narrow as possible — write-only on public forms with strict checks.

## 8. Public API / Webhooks

There are no traditional REST API routes or inbound webhooks. All data access goes through TanStack Start `createServerFn` RPCs. The only externally accessible special route is `GET /sitemap.xml`.

## Open questions for the team

1. **Image uploads:** Currently external URLs. If user-uploaded event images are needed, a Supabase Storage bucket with RLS would be added.
2. **Additional roles:** `moderator` and `organizer` exist in the enum but have no active policies or gates yet.
3. **Production email domain:** Emails currently send from `onboarding@resend.dev`; a verified domain is needed for production deliverability.
4. **OAuth providers:** Only Google is wired. Others can be added via Lovable's auth integration.
5. **Inbound webhooks:** None currently (Stripe, Supabase webhooks, cron, etc.).
