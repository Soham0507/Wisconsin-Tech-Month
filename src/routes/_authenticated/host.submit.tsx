import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import {
  WEEKS,
  FORMATS,
  HOST_ORG_TYPES,
  MIDWEST_CITIES,
  displayCity,

  TOPIC_OPTIONS,
  type WeekKey,
} from "@/lib/wtm-data";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEvent, getMyEvent } from "@/lib/events.functions";
import { getMyHostDefaults, saveMyHostDefaults } from "@/lib/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Check, ImagePlus, Loader2, X, Building2 } from "lucide-react";
import { ImageCropDialog } from "@/components/wtm/ImageCropDialog";
import { z } from "zod";
import { toast } from "sonner";
import { Turnstile } from "@/lib/turnstile";


const searchSchema = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/host/submit")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Submit an event — WTM 2026" },
      { name: "description", content: "Submit your event to Wisconsin Tech Month 2026 for review." },
    ],
  }),
  component: SubmitPage,
});

type Path = "external" | "internal";

const OCT_MIN = "2026-10-01T00:00";
const OCT_MAX = "2026-10-31T23:59";

const emptyForm = () => ({
  path: "external" as Path,
  title: "",
  description: "",
  host_org: "",
  host_url: "",
  host_org_type: "Company",
  host_email: "",
  host_contact_name: "",
  host_contact_phone: "",
  host_contact_role: "",
  host_logo_url: "",
  image_url: "",
  week: "w1" as WeekKey,
  format: "in-person" as "in-person" | "virtual" | "hybrid",
  city: "",
  venue: "",
  address: "",
  starts_at: "",
  ends_at: "",
  capacity: "" as string,
  cost_cents: 0,
  external_url: "",
  topics: [] as string[],
});

function SubmitPage() {
  const search = useSearch({ from: "/_authenticated/host/submit" });
  const navigate = useNavigate();
  const submit = useServerFn(submitEvent);
  const loadOne = useServerFn(getMyEvent);
  const loadDefaults = useServerFn(getMyHostDefaults);
  const saveDefaults = useServerFn(saveMyHostDefaults);
  const [form, setForm] = useState(emptyForm());
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isAdminEditor, setIsAdminEditor] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageErr, setImageErr] = useState<string | null>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);


  const fmtMB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;


  useEffect(() => {
    if (!search.id) return;
    loadOne({ data: { id: search.id } }).then(({ event, viewerIsAdmin }) => {
      setIsAdminEditor(Boolean(viewerIsAdmin));
      if (!event) return;
      setForm({
        path: event.path,
        title: event.title,
        description: event.description ?? "",
        host_org: event.host_org,
        host_url: event.host_url ?? "",
        host_org_type: event.host_org_type ?? "Company",
        host_email: event.host_email ?? "",
        host_contact_name: event.host_contact_name ?? "",
        host_contact_phone: event.host_contact_phone ?? "",
        host_contact_role: event.host_contact_role ?? "",
        host_logo_url: event.host_logo_url ?? "",
        image_url: event.image_url ?? "",
        week: (event.week as WeekKey) ?? "w1",
        format: event.format,
        city: displayCity(event.city),
        venue: event.venue ?? "",
        address: event.address ?? "",
        starts_at: event.starts_at ? event.starts_at.slice(0, 16) : "",
        ends_at: event.ends_at ? event.ends_at.slice(0, 16) : "",
        capacity: event.capacity?.toString() ?? "",
        cost_cents: event.cost_cents,
        external_url: event.external_url ?? "",
        topics: event.topics ?? [],
      });
    });
  }, [search.id, loadOne]);

  // Prefill host info from profile on new submissions
  useEffect(() => {
    if (search.id) return;
    loadDefaults().then(({ defaults }) => {
      if (!defaults) return;
      const hasAny =
        defaults.host_org || defaults.host_url || defaults.host_email ||
        defaults.host_contact_name || defaults.host_contact_phone;
      if (hasAny) setSaveToProfile(false);
      setForm((f) => ({
        ...f,
        host_org: f.host_org || defaults.host_org,
        host_url: f.host_url || defaults.host_url,
        host_org_type: defaults.host_org_type || f.host_org_type,
        host_email: f.host_email || defaults.host_email,
        host_contact_name: f.host_contact_name || defaults.host_contact_name,
        host_contact_phone: f.host_contact_phone || defaults.host_contact_phone,
        host_contact_role: f.host_contact_role || defaults.host_contact_role,
        host_logo_url: f.host_logo_url || defaults.host_logo_url,
      }));
    }).catch((e) => console.error("[prefill host]", e));
  }, [search.id, loadDefaults]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));


  const week = useMemo(() => WEEKS[form.week], [form.week]);

  const pickFile = async (file: File) => {
    setImageErr(null);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setImageErr("This file type isn't supported. Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageErr(`This image is ${fmtMB(file.size)}. Please upload one under 5 MB (try exporting at a smaller size or lower quality).`);
      return;
    }

    // Source must be large enough that a 16:9 crop can meet 1024×576.
    const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
      img.src = url;
    });
    if (!dims) {
      setImageErr("We couldn't read that image. Try a different file, or re-export it as JPG or PNG.");
      return;
    }
    if (dims.w < 1024 || dims.h < 576) {
      setImageErr(`This image is ${dims.w}×${dims.h}. Please upload one that's at least 1024×576 so it looks clear on the event page.`);
      return;
    }
    setCropFile(file);
  };

  const uploadBlob = async (blob: Blob, ext: string) => {
    setCropFile(null);
    setUploading(true);
    setImageErr(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("You need to be signed in to upload an image.");
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("event-images").upload(path, blob, {
        cacheControl: "3600", upsert: false, contentType: blob.type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("event-images").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      set("image_url", signed.signedUrl);
    } catch (e) {
      setImageErr(e instanceof Error ? `Upload didn't finish: ${e.message}. Check your connection and try again.` : "Upload didn't finish. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const pickLogo = async (file: File) => {
    setLogoErr(null);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setLogoErr("This file type isn't supported. Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setLogoErr(`This logo is ${fmtMB(file.size)}. Please upload one under 3 MB.`);
      return;
    }
    setLogoCropFile(file);
  };

  const uploadLogoBlob = async (blob: Blob, ext: string) => {
    setLogoCropFile(null);
    setLogoUploading(true);
    setLogoErr(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("You need to be signed in to upload a logo.");
      const path = `${uid}/logo-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("event-images").upload(path, blob, {
        cacheControl: "3600", upsert: false, contentType: blob.type,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("event-images").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      set("host_logo_url", signed.signedUrl);
    } catch (e) {
      setLogoErr(e instanceof Error ? `Upload didn't finish: ${e.message}. Check your connection and try again.` : "Upload didn't finish. Check your connection and try again.");
    } finally {
      setLogoUploading(false);
    }
  };
  const validateForm = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 2) {
      next.title = "Please enter an event title (at least 2 characters).";
    }
    if (!form.description.trim()) {
      next.description = "Please enter a short description of the event.";
    }
    if (!form.image_url) {
      next.image_url = "Please upload an event image — JPG, PNG, or WebP, at least 1024×576, under 5 MB.";
    }
    if (!form.format) {
      next.format = "Please select a format (in-person, virtual, or hybrid).";
    }
    if (!form.city.trim()) {
      next.city = "Please enter a city or area where the event is happening.";
    }
    if (form.format !== "virtual" && !form.address.trim()) {
      next.address = "Please enter a street address or location.";
    }
    const capacityNum = parseInt(form.capacity, 10);
    if (!form.capacity || Number.isNaN(capacityNum) || capacityNum < 1) {
      next.capacity = "Please enter a capacity of at least 1.";
    }
    if (!form.starts_at) {
      next.starts_at = "Please enter a start date and time in October 2026.";
    } else if (!/^2026-10-(0[1-9]|[12]\d|3[01])T\d{2}:\d{2}(:\d{2})?$/.test(form.starts_at)) {
      next.starts_at = "Start date must be in October 2026 and include a time.";
    }
    if (form.ends_at) {
      if (!/^2026-10-(0[1-9]|[12]\d|3[01])T\d{2}:\d{2}(:\d{2})?$/.test(form.ends_at)) {
        next.ends_at = "End date must be in October 2026 and include a time.";
      } else if (form.starts_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
        next.ends_at = "End time must be after the start time.";
      }
    }
    if (form.topics.length === 0) {
      next.topics = "Please pick at least one topic so attendees can find your event.";
    }
    if (form.path === "external" || form.format === "virtual") {
      if (!form.external_url.trim()) {
        next.external_url = form.format === "virtual"
          ? "Please enter the URL where attendees will join the virtual event (Zoom, Meet, etc.)."
          : "Please enter the external registration URL where attendees can sign up.";
      } else if (!/^https?:\/\//i.test(form.external_url.trim())) {
        next.external_url = "URL must start with https:// (we'll add it for you if you leave it off).";
      }
    }
    if (!form.host_org.trim()) {
      next.host_org = "Please enter the host organization name.";
    }
    if (!form.host_url.trim()) {
      next.host_url = "Please enter the host organization website.";
    } else if (!/^https?:\/\//i.test(form.host_url.trim())) {
      next.host_url = "Website URL must start with https://.";
    }
    if (!form.host_org_type) {
      next.host_org_type = "Please select an organization type.";
    }
    if (!form.host_email.trim()) {
      next.host_email = "Please enter a host email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.host_email.trim())) {
      next.host_email = "Please enter a valid email address (e.g., hello@your-org.com).";
    }
    if (!form.host_contact_name.trim()) {
      next.host_contact_name = "Please enter a contact person name.";
    }
    if (!form.host_contact_phone.trim()) {
      next.host_contact_phone = "Please enter a contact phone number.";
    } else if (form.host_contact_phone.trim().length < 5) {
      next.host_contact_phone = "Phone number is too short.";
    }
    return next;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm();
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setErr("Please fix the highlighted fields before submitting.");
      const firstKey = Object.keys(validation)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement).focus?.();
      }
      toast.error("Please fix the highlighted fields", {
        description: "We need a few more details before you can submit this event.",
      });
      return;
    }
    if (!captchaToken) {
      setErr("Please complete the captcha before submitting.");
      toast.error("Captcha required", { description: "Please complete the captcha to submit." });
      return;
    }
    setStatus("saving"); setErr(null);

    try {
      await submit({
        data: {
          id: search.id,
          path: form.path,
          title: form.title,
          description: form.description,
          host_org: form.host_org,
          host_url: form.host_url,
          host_org_type: form.host_org_type,
          host_email: form.host_email,
          host_contact_name: form.host_contact_name,
          host_contact_phone: form.host_contact_phone,
          host_contact_role: form.host_contact_role,
          host_logo_url: form.host_logo_url,
          image_url: form.image_url,
          week: form.week,
          format: form.format,
          city: displayCity(form.city),
          venue: form.venue,
          address: form.address,
          starts_at: form.starts_at, // local "YYYY-MM-DDTHH:MM"
          ends_at: form.ends_at,
          capacity: form.capacity ? parseInt(form.capacity, 10) : 0,
          cost_cents: form.cost_cents,
          external_url: form.external_url,
          topics: form.topics,
          captchaToken,
        },
      });

      if (saveToProfile) {
        saveDefaults({
          data: {
            host_org: form.host_org,
            host_url: form.host_url,
            host_org_type: form.host_org_type,
            host_email: form.host_email,
            host_contact_name: form.host_contact_name,
            host_contact_phone: form.host_contact_phone,
            host_contact_role: form.host_contact_role,
            host_logo_url: form.host_logo_url,
          },
        }).catch((e) => console.error("[saveMyHostDefaults]", e));
      }
      setStatus("saved");
      setTimeout(() => navigate({ to: "/host/dashboard" }), 900);
    } catch (e2) {
      setStatus("error");
      const msg = e2 instanceof Error ? e2.message : "Something went wrong.";
      const next: Record<string, string> = {};
      // Try to parse a Zod-style validation error from the server and map it
      // to the matching field so the inline message is friendly.
      const issues = (e2 as any)?.issues;
      if (Array.isArray(issues)) {
        for (const issue of issues) {
          const path = issue.path?.[0];
          if (typeof path === "string" && !next[path]) {
            next[path] = issue.message;
          }
        }
      } else if (msg.toLowerCase().includes("october 2026")) {
        next.starts_at = "Start date must be in October 2026 and include a time.";
      }
      if (Object.keys(next).length > 0) {
        setErrors((prev) => ({ ...prev, ...next }));
        setErr("We couldn't save your event. Please check the highlighted fields and try again.");
        toast.error("Submission failed", { description: "Please fix the highlighted fields and try again." });
      } else {
        setErr("We couldn't save your event. Please check the highlighted fields and try again.");
        toast.error("Submission failed", { description: msg });
      }
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-10">
        <div className="font-mono text-xs uppercase tracking-widest text-primary">
          {search.id ? "Edit event" : "Submit an event"}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">
          {search.id ? "Update your event" : "List your event"}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {isAdminEditor
            ? "Admin edit: changes publish immediately and keep the event's current status and organizer."
            : <>Pick a submission type, fill in the details, and our team will review within 2-3 business days.{search.id && " Edits to approved events go back into the review queue."}</>}
        </p>

        {/* Path picker */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PathCard active={form.path === "external"} onClick={() => set("path", "external")}
            title="External URL" desc="Registration lives elsewhere (Eventbrite, Luma, Partiful, your own site)." />
          <PathCard active={form.path === "internal"} onClick={() => set("path", "internal")}
            title="Manage event on WTM site" desc="We host the RSVP page, collect registrations, and give you attendee data." />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={onSubmit} className="card-constellation rounded-2xl p-7">
            <Field label="Event title *" error={errors.title} field="title">
              <input required maxLength={200} className="field" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="Short description *" error={errors.description} field="description">
              <textarea required maxLength={4000} className="field min-h-[100px]"
                value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Event image *" hint="Landscape 16:9, at least 1024×576 (1600×900 recommended). JPG, PNG, or WebP, under 5MB." error={imageErr || errors.image_url} field="image_url">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }} />
              {form.image_url ? (
                <div className="relative overflow-hidden rounded-xl border border-white/10">
                  <img src={form.image_url} alt="Event preview" className="aspect-[16/9] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/60 px-3 py-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="font-mono text-[11px] uppercase tracking-widest text-primary hover:underline">
                      Replace image
                    </button>
                    <button type="button" onClick={() => { set("image_url", ""); setImageErr(null); }}
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Remove image">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex h-16 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground disabled:opacity-60">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <span>{uploading ? "Uploading…" : "Click to upload an event image"}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest">16:9 · min 1024×576 · up to 5MB</span>
                </button>

              )}
            </Field>


            <div className="mt-4 grid gap-4 field-grid md:grid-cols-2">
              <Field label="Format *" error={errors.format} field="format">
                <select required className="field" value={form.format} onChange={(e) => set("format", e.target.value as typeof form.format)}>
                  {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </Field>
              <Field label="City / area *" error={errors.city} field="city">
                <input
                  required
                  list="midwest-cities"
                  className="field"
                  placeholder="Type to search Midwest cities…"
                  value={form.city}
                  onChange={(e) => set("city", displayCity(e.target.value))}
                  onBlur={(e) => set("city", displayCity(e.target.value))}
                />
                <p className="mt-1 text-xs text-muted-foreground">City name only — we add the state automatically.</p>

                <datalist id="midwest-cities">
                  {MIDWEST_CITIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field
                label="Address *"
                error={errors.address}
                field="address"
              >
                <input
                  required={form.format !== "virtual"}
                  disabled={form.format === "virtual"}
                  className="field disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder={form.format === "virtual" ? "--virtual--" : "Street, City, State ZIP"}
                  value={form.format === "virtual" ? "--virtual--" : form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
              <Field label="Capacity *" error={errors.capacity} field="capacity">
                <input required type="number" min={1} className="field" value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)} />
              </Field>
              <Field label="Starts at * (October 2026)" error={errors.starts_at} field="starts_at">
                <input
                  required
                  type="datetime-local"
                  className="field"
                  min={OCT_MIN}
                  max={OCT_MAX}
                  value={form.starts_at}
                  onChange={(e) => set("starts_at", e.target.value)}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value && !value.includes("T")) {
                      toast.error("Please enter a start time", {
                        description: "Select both a date and a time so attendees know when the event begins.",
                      });
                    }
                  }}
                />
              </Field>
              <Field label="Ends at (October 2026)" error={errors.ends_at} field="ends_at">
                <input
                  type="datetime-local"
                  className="field"
                  min={OCT_MIN}
                  max={OCT_MAX}
                  value={form.ends_at}
                  onChange={(e) => set("ends_at", e.target.value)}
                />
              </Field>
            </div>


            <Field label="Topics * (choose one or more)" error={errors.topics} field="topics">
              <PillPicker
                options={TOPIC_OPTIONS}
                value={form.topics}
                onChange={(v) => set("topics", v)}
                addPlaceholder="Add a topic…"
              />
            </Field>



            {form.path === "external" || form.format === "virtual" ? (
              <div className="mt-4 grid gap-4 field-grid md:grid-cols-2">
                <Field
                  label={form.format === "virtual" && form.path !== "external" ? "Virtual event URL *" : "External registration URL *"}
                  error={errors.external_url}
                  field="external_url"
                >
                  <input required type="url" className="field"
                    placeholder={form.format === "virtual" && form.path !== "external" ? "https://zoom.us/j/..." : "https://luma.com/your-event"}
                    value={form.external_url}
                    onChange={(e) => set("external_url", e.target.value)}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      if (!t) { if (form.external_url !== "") set("external_url", ""); return; }
                      const normalized = /^https?:\/\//i.test(t) ? t : `https://${t}`;
                      if (normalized !== form.external_url) set("external_url", normalized);
                    }} />
                </Field>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 field-grid md:grid-cols-2">
                <Field label="Venue name" error={errors.venue} field="venue">
                  <input className="field" value={form.venue} onChange={(e) => set("venue", e.target.value)} />
                </Field>
              </div>
            )}

            <Field label="Week of programming *" error={errors.week} field="week">
              <select required className="field" value={form.week} onChange={(e) => set("week", e.target.value as WeekKey)}>
                {(Object.entries(WEEKS) as [WeekKey, typeof WEEKS["w1"]][]).map(([k, w]) => (
                  <option key={k} value={k}>{w.dates} — {w.name}</option>
                ))}
              </select>
            </Field>

            {/* Event Host Information — admin reference, not shown publicly */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-bold">Host information</h2>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  FOR OUR TEAM&nbsp;
                </span>
              </div>

              <div className="grid gap-4 field-grid md:grid-cols-2">

                <Field label="Host organization *" error={errors.host_org} field="host_org">
                  <input required maxLength={160} className="field" value={form.host_org} onChange={(e) => set("host_org", e.target.value)} />
                </Field>
                <Field label="Host organization website *" error={errors.host_url} field="host_url">
                  <input required type="text" maxLength={1000} className="field" placeholder="your-org.com"
                    value={form.host_url}
                    onChange={(e) => set("host_url", e.target.value)}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      if (!t) { if (form.host_url !== "") set("host_url", ""); return; }
                      const normalized = /^https?:\/\//i.test(t) ? t : `https://${t}`;
                      if (normalized !== form.host_url) set("host_url", normalized);
                    }} />
                </Field>
                <Field label="Host organization type *" error={errors.host_org_type} field="host_org_type">
                  <select required className="field" value={form.host_org_type} onChange={(e) => set("host_org_type", e.target.value)}>
                    {HOST_ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Host email *" error={errors.host_email} field="host_email">
                  <input required type="email" maxLength={255} className="field" placeholder="hello@your-org.com"
                    value={form.host_email} onChange={(e) => set("host_email", e.target.value)} />
                </Field>
                <Field label="Contact person name *" error={errors.host_contact_name} field="host_contact_name">
                  <input required maxLength={120} className="field" placeholder="Jane Doe"
                    value={form.host_contact_name} onChange={(e) => set("host_contact_name", e.target.value)} />
                </Field>
                <Field label="Contact phone *" error={errors.host_contact_phone} field="host_contact_phone">
                  <input required type="tel" maxLength={40} className="field" placeholder="(555) 123-4567"
                    value={form.host_contact_phone} onChange={(e) => set("host_contact_phone", e.target.value)} />
                </Field>
                <Field label="Contact role / title" error={errors.host_contact_role} field="host_contact_role">
                  <input maxLength={120} className="field" placeholder="Events Manager"
                    value={form.host_contact_role} onChange={(e) => set("host_contact_role", e.target.value)} />
                </Field>
                <div className="hidden md:block" />
              </div>

              {/* Company logo — optional, shown on the event page as a fallback icon */}
              <Field label="Company logo" hint="Optional. Square, 256×256+ recommended. Without one, a company icon appears on the event page." error={logoErr} field="host_logo_url">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) pickLogo(f); e.target.value = ""; }}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-background/60 hover:border-primary/60 disabled:opacity-60"
                  >
                    {form.host_logo_url ? (
                      <img src={form.host_logo_url} alt="Host logo" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary/70" />
                    )}
                  </button>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="font-semibold hover:text-primary disabled:opacity-60"
                    >
                      {logoUploading ? "Uploading…" : form.host_logo_url ? "Change" : "Upload logo"}
                    </button>
                    {form.host_logo_url && (
                      <button
                        type="button"
                        onClick={() => { set("host_logo_url", ""); setLogoErr(null); }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </Field>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-medium">Save this host info to my profile</span>
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Hosting multiple events? We'll prefill this next time.
                  </span>
                </span>
              </label>
            </div>

            {err && <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}


            <div className="mt-6">
              <Turnstile
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button type="submit" disabled={status === "saving" || !captchaToken}
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal disabled:opacity-60">
                {status === "saving"
                  ? "Saving…"
                  : status === "saved"
                    ? "Saved ✓"
                    : search.id
                      ? isAdminEditor
                        ? "Publish changes"
                        : "Save & resubmit"
                      : "Submit for review"}
              </button>
              <Link to="/host/dashboard" className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary">
                Cancel
              </Link>
            </div>
          </form>


          {/* Live preview */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Live preview</div>
            <article className="card-constellation mt-2 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <Calendar className="mr-1 inline h-3 w-3" /> {form.starts_at ? new Date(form.starts_at).toLocaleString() : "Date TBA"}
                </div>
                <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                  style={{ borderColor: week.color, color: week.color }}>
                  {week.name}
                </span>
              </div>
              <h3 className="mt-3 font-display text-xl font-bold">{form.title || "Your event title"}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{form.description || "Description preview…"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary" /> {form.city || "City"} · {form.format.replace("-", " ")} · {form.host_org || "Host"}
              </div>
            </article>
          </aside>
        </div>
      </main>
      <Footer />
      <ImageCropDialog
        file={cropFile}
        open={!!cropFile}
        onCancel={() => setCropFile(null)}
        onConfirm={(blob, ext) => uploadBlob(blob, ext)}
      />
      <ImageCropDialog
        file={logoCropFile}
        open={!!logoCropFile}
        onCancel={() => setLogoCropFile(null)}
        onConfirm={(blob, ext) => uploadLogoBlob(blob, ext)}
        aspect={1}
        outWidth={512}
        outHeight={512}
        title="Crop your logo"
        hint="Position and zoom to fit the square. Output is 512×512."
        transparent
      />

      <style>{`
        .field { width: 100%; box-sizing: border-box; border-radius: 10px; border: 1px solid oklch(1 0 0 / 0.14); background: oklch(0.16 0.04 265 / 0.6); padding: 0.6rem 0.85rem; font-size: 0.875rem; line-height: 1.25rem; color: var(--color-foreground); font-family: inherit; }
        input.field, select.field { height: 2.5rem; padding-top: 0; padding-bottom: 0; }
        .field:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
        .field-grid > label { margin-top: 0; }
        .field-error .field { border-color: var(--color-destructive); outline-color: var(--color-destructive); }
        .field-error .field:focus { outline: 2px solid var(--color-destructive); }
      `}</style>
    </>
  );
}

function Field({ label, hint, error, field, children }: { label: string; hint?: string; error?: string | null; field?: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block first:mt-0" data-field={field}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`mt-1.5 ${error ? "field-error" : ""}`}>{children}</div>
      {error && <span className="mt-1.5 block text-[11px] text-destructive">{error}</span>}
      {hint && !error && <span className="mt-1.5 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}



function PathCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`card-constellation rounded-2xl p-5 text-left transition-all ${active ? "ring-2 ring-primary" : "hover:border-primary/50"}`}>
      <div className="flex items-center justify-between">
        <div className="font-display text-lg font-bold">{title}</div>
        {active && <Check className="h-4 w-4 text-primary" />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}

function PillPicker({
  options,
  value,
  onChange,
  addPlaceholder,
  max = 8,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  addPlaceholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (value.length < max) onChange([...value, opt]);
  };
  const addCustom = () => {
    const v = draft.trim().slice(0, 24);
    if (!v) return;
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    if (value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  };
  const customs = value.filter((v) => !options.includes(v));
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/15 bg-white/[0.03] text-muted-foreground hover:border-primary/60 hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
        {customs.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/15 px-3 py-1 text-xs text-foreground"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addCustom(); }
          }}
          maxLength={24}
          placeholder={addPlaceholder ?? "Add…"}
          className="field flex-1"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!draft.trim() || value.length >= max}
          className="rounded-full border border-white/15 px-4 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:border-primary/60 hover:text-foreground disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
