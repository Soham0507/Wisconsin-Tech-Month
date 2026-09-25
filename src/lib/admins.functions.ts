import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export type AdminEntry = { user_id: string; email: string | null; granted_at: string };
export type InviteEntry = { email: string; created_at: string };

// List current admins + pending email invites
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);

    const { data: roleRows, error: rolesErr } = await context.supabase
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });
    if (rolesErr) throw new Error(rolesErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const admins: AdminEntry[] = [];
    for (const r of roleRows ?? []) {
      const { data: udata } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      admins.push({
        user_id: r.user_id,
        email: udata?.user?.email ?? null,
        granted_at: r.created_at as string,
      });
    }

    const { data: invRows, error: invErr } = await context.supabase
      .from("pending_admin_invites")
      .select("email, created_at")
      .order("created_at", { ascending: true });
    if (invErr) throw new Error(invErr.message);

    return {
      admins,
      invites: (invRows ?? []) as InviteEntry[],
      currentUserId: context.userId,
    };
  });

// Grant admin by email — if account exists, grant now; else queue invite.
export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(320) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look for an existing user with this email (paginate defensively)
    let foundId: string | null = null;
    let page = 1;
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const match = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
      if (match) { foundId = match.id; break; }
      if (list.users.length < 200) break;
      page += 1;
    }

    if (foundId) {
      const { error } = await context.supabase
        .from("user_roles")
        .insert({ user_id: foundId, role: "admin" });
      if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
      // Notify the existing user
      const { sendAdminGranted } = await import("./email.server");
      await sendAdminGranted(data.email);
      return { status: "granted" as const, email: data.email };
    }

    const { error: invErr } = await context.supabase
      .from("pending_admin_invites")
      .insert({ email: data.email, invited_by: context.userId });
    if (invErr && !/duplicate|unique/i.test(invErr.message)) throw new Error(invErr.message);

    // Send Supabase invite email so they can create a login
    const appUrl = process.env.APP_PUBLIC_URL || "https://witechmonth.com";
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${appUrl}/admin`,
    });
    if (inviteErr) {
      // Non-fatal: invite row still exists so trigger fires when they sign up manually.
      console.warn("[grantAdminByEmail] inviteUserByEmail failed:", inviteErr.message);
    }
    return { status: "invited" as const, email: data.email };
  });


export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) =>
    z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("You can't revoke your own admin role.");
    }
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const cancelAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) =>
    z.object({ email: z.string().trim().toLowerCase().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("pending_admin_invites")
      .delete()
      .eq("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -------- Site user directory (admins + hosts) --------
export type SiteUser = {
  user_id: string;
  email: string | null;
  name: string | null;
  access: ("admin" | "host")[];
  events_count: number;
  joined_at: string | null;
};

export const listSiteUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { search?: string }) =>
    z.object({ search: z.string().trim().max(200).optional() }).default({}).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load admin role holders
    const { data: adminRows } = await context.supabase
      .from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = new Set((adminRows ?? []).map((r) => r.user_id));

    // Load events grouped by organizer to determine hosts + counts
    const { data: eventRows } = await context.supabase
      .from("events").select("organizer_id");
    const hostCounts = new Map<string, number>();
    for (const e of eventRows ?? []) {
      hostCounts.set(e.organizer_id, (hostCounts.get(e.organizer_id) ?? 0) + 1);
    }

    // Union of ids
    const ids = new Set<string>([...adminIds, ...hostCounts.keys()]);

    // Fetch each auth user
    const users: SiteUser[] = [];
    for (const id of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      const meta = (u?.user?.user_metadata ?? {}) as { name?: string; full_name?: string };
      const email = u?.user?.email ?? null;
      const name = meta.name ?? meta.full_name ?? null;
      const access: ("admin" | "host")[] = [];
      if (adminIds.has(id)) access.push("admin");
      if (hostCounts.has(id)) access.push("host");
      users.push({
        user_id: id,
        email,
        name,
        access,
        events_count: hostCounts.get(id) ?? 0,
        joined_at: u?.user?.created_at ?? null,
      });
    }

    const q = (data.search ?? "").toLowerCase().trim();
    const filtered = q
      ? users.filter((u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.name ?? "").toLowerCase().includes(q))
      : users;

    filtered.sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
    return { users: filtered };
  });

export const getUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
    const meta = (u?.user?.user_metadata ?? {}) as { name?: string; full_name?: string };

    const { data: roleRows } = await context.supabase
      .from("user_roles").select("role").eq("user_id", data.user_id);
    const roles = (roleRows ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin");

    const { data: events } = await context.supabase
      .from("events")
      .select("id, title, status, created_at, city, week, starts_at")
      .eq("organizer_id", data.user_id)
      .order("created_at", { ascending: false });

    return {
      user: {
        id: data.user_id,
        email: u?.user?.email ?? null,
        name: meta.name ?? meta.full_name ?? null,
        joined_at: u?.user?.created_at ?? null,
        access: [
          ...(isAdmin ? ["admin"] : []),
          ...((events ?? []).length > 0 ? ["host"] : []),
        ] as ("admin" | "host")[],
      },
      events: events ?? [],
    };
  });

