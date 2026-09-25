import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type HostDefaults = {
  host_org: string;
  host_url: string;
  host_org_type: string;
  host_email: string;
  host_contact_name: string;
  host_contact_phone: string;
  host_contact_role: string;
  host_logo_url: string;
};

export const getMyHostDefaults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("host_org, host_url, host_org_type, host_email, host_contact_name, host_contact_phone, host_contact_role, host_logo_url")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) {
      console.error("[getMyHostDefaults]", error);
      return { defaults: null as HostDefaults | null };
    }
    if (!data) return { defaults: null as HostDefaults | null };
    const defaults: HostDefaults = {
      host_org: data.host_org ?? "",
      host_url: data.host_url ?? "",
      host_org_type: data.host_org_type ?? "",
      host_email: data.host_email ?? "",
      host_contact_name: data.host_contact_name ?? "",
      host_contact_phone: data.host_contact_phone ?? "",
      host_contact_role: data.host_contact_role ?? "",
      host_logo_url: data.host_logo_url ?? "",
    };
    return { defaults };
  });

const saveSchema = z.object({
  host_org: z.string().max(160).optional().default(""),
  host_url: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      if (!t) return "";
      return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    },
    z.string().max(1000),
  ).optional().default(""),
  host_org_type: z.string().max(80).optional().default(""),
  host_email: z.string().max(255).optional().default(""),
  host_contact_name: z.string().max(120).optional().default(""),
  host_contact_phone: z.string().max(40).optional().default(""),
  host_contact_role: z.string().max(120).optional().default(""),
  host_logo_url: z.string().max(1000).optional().default(""),
});

export const saveMyHostDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        host_org: data.host_org || null,
        host_url: data.host_url || null,
        host_org_type: data.host_org_type || null,
        host_email: data.host_email || null,
        host_contact_name: data.host_contact_name || null,
        host_contact_phone: data.host_contact_phone || null,
        host_contact_role: data.host_contact_role || null,
        host_logo_url: data.host_logo_url || null,
      })
      .eq("id", context.userId);
    if (error) {
      console.error("[saveMyHostDefaults]", error);
      throw new Error(error.message);
    }
    return { ok: true };
  });
