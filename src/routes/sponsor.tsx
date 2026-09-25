import { createFileRoute } from "@tanstack/react-router";
import { Header, Footer } from "@/components/wtm/Chrome";
import { Check } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitSponsorInquiry } from "@/lib/sponsor.functions";
import { Turnstile } from "@/lib/turnstile";


export const Route = createFileRoute("/sponsor")({
  head: () => ({
    meta: [
      { title: "Sponsor WTM 2026 — Connected Through Innovation" },
      { name: "description", content: "Wisconsin Tech Month unites startups, corporations, educators, and community organizations every October. Sponsor the statewide movement." },
      { property: "og:title", content: "Sponsor Wisconsin Tech Month 2026" },
      { property: "og:description", content: "Statewide reach, 3x growth trajectory, cross-sector audience. Become a WTM 2026 sponsor." },
    ],
  }),
  component: SponsorPage,
});

const WHY = [
  { title: "Statewide Reach", body: "10–15 Wisconsin counties" },
  { title: "3× Growth", body: "Credible trajectory: 500 → 2,500 attendees" },
  { title: "Cross-Sector", body: "Manufacturing, healthcare, finance & tech" },
  { title: "National Recognition", body: "Midwest benchmark; national press target" },
];

const AUDIENCE = ["Startups", "Industry", "Community", "Education", "Government", "Investors"];


export default function SponsorPage() { return <Page />; }
function Page() {
  return (
    <>
      <Header />
      <main>
        {/* Hero — Past partners */}
        <section className="relative overflow-hidden border-b border-border/60 bg-background/30 pt-16 pb-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            }}
          />

          <div className="relative mx-auto max-w-3xl px-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary">
              ★ WTM PARTNERS
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Reach Wisconsin's tech ecosystem.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Align your brand with a month-long initiative that unites startups, corporations, educators, and community organizations to showcase innovation, drive economic growth, and expand technology access across Wisconsin.
            </p>
            <a
              href="#inquiry"
              className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
            >
              Become a sponsor
            </a>
          </div>

          <div className="relative mt-14">
            <LogoRow direction="left" items={PARTNERS_ROW1} />
            <div className="h-4" />
            <LogoRow direction="right" items={PARTNERS_ROW2} />

            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
          </div>


        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-16">
          <div className="font-mono text-[11px] uppercase tracking-widest text-primary">Benefits</div>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Benefits of sponsoring WTM</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <div key={w.title} className="card-constellation rounded-2xl p-6">
                <div className="font-display text-lg font-bold text-primary">{w.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Audience */}
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="font-mono text-xs uppercase tracking-widest text-primary">Your audience reach</div>
          <ul className="mt-4 grid gap-x-4 gap-y-2 text-foreground/90 sm:grid-cols-2 sm:max-w-md">
            {AUDIENCE.map((a) => (
              <li key={a} className="flex items-start gap-3">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </section>



        {/* Inquiry */}
        <section id="inquiry" className="mx-auto max-w-3xl px-5 py-16">
          <InquiryForm />
        </section>

        {/* Contact */}
        <section className="mx-auto max-w-3xl px-5 pb-20">
          <div className="card-constellation rounded-2xl p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-primary">Become a sponsor</div>
            <h3 className="mt-2 font-display text-2xl font-bold">Prefer to reach out directly?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Contact us to speak about opportunities and impact in partnering during WTM,</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Direct line</div>
                <a href="mailto:Nadiyah@jetconstellations.com" className="mt-1 block font-display text-lg font-semibold text-primary hover:underline break-all">
                  Nadiyah@jetconstellations.com
                </a>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Web</div>
                <a href="https://witechmonth.com" className="mt-1 block font-display text-lg font-semibold text-primary hover:underline">
                  witechmonth.com
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        .field { width: 100%; border-radius: 10px; border: 1px solid oklch(1 0 0 / 0.14); background: oklch(0.16 0.04 265 / 0.6); padding: 0.6rem 0.85rem; font-size: 0.875rem; color: var(--color-foreground); font-family: var(--font-sans); }
        .field::placeholder { color: var(--color-muted-foreground); }
        .field:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
        @keyframes wtm-scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes wtm-scroll-right { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        .wtm-scroll-left { animation: wtm-scroll-left 40s linear infinite; }
        .wtm-scroll-right { animation: wtm-scroll-right 40s linear infinite; }
      `}</style>
    </>
  );
}

const PARTNERS_ROW1 = [
  "Northwestern Mutual",
  "Milwaukee Tool",
  "gener8tor",
  "Husch Blackwell",
  "Robert Half",
  "Visit Milwaukee",
  "Midwest Founders",
];
const PARTNERS_ROW2 = [
  "Rockwell Automation",
  "American Family",
  "Fiserv",
  "Foley & Lardner",
  "UW–Madison",
  "MSOE",
];

function LogoRow({ items, direction }: { items: string[]; direction: "left" | "right" }) {
  const repeated = [...items, ...items, ...items, ...items];
  return (
    <div className="overflow-hidden">
      <div className={`flex w-max gap-4 ${direction === "left" ? "wtm-scroll-left" : "wtm-scroll-right"}`}>
        {repeated.map((name, i) => (
          <div
            key={`${name}-${i}`}
            className="flex h-16 min-w-[220px] items-center justify-center rounded-xl border border-border/60 bg-background/60 px-6 font-display text-sm font-semibold text-foreground/80 backdrop-blur-sm"
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}



function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}


function InquiryForm() {
  const submit = useServerFn(submitSponsorInquiry);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [form, setForm] = useState({

    name: "",
    email: "",
    company: "",
    tierInterest: "Not sure yet",
    budgetRange: null as string | null,
    cityFocus: "Statewide",
    message: "",
    interests: [] as string[],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleInterest = (opt: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(opt)
        ? f.interests.filter((i) => i !== opt)
        : [...f.interests, opt],
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setStatus("error");
      setError("Please complete the captcha before sending.");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      await submit({ data: { ...form, captchaToken } });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCaptchaToken(null);
    }
  };


  if (status === "success") {
    return (
      <div className="card-constellation flex flex-col items-start rounded-2xl p-7">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
          <Check className="h-5 w-5" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold">Inquiry received.</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Thanks, {form.name.split(" ")[0] || "friend"}. The WTM sponsorship team will reply to{" "}
          <span className="text-primary">{form.email}</span> within two business days with next steps and a tailored package.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-full border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form className="card-constellation rounded-2xl p-7" onSubmit={onSubmit}>
      <h2 className="font-display text-2xl font-bold">Talk to the sponsorship team.</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Send a short inquiry and we'll reply within two business days.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Your name">
          <input required maxLength={120} className="field" placeholder="Alex Anderson"
            value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="COMPANY/ORGANIZATION">
          <input required maxLength={160} className="field" placeholder="Company name"
            value={form.company} onChange={(e) => set("company", e.target.value)} />
        </Field>
        <Field label="Work email">
          <input required type="email" maxLength={255} className="field" placeholder="alex@company.com"
            value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Note">
          <textarea maxLength={2000} className="field min-h-[100px]"
            placeholder="A short note on goals, audiences, or activations."
            value={form.message} onChange={(e) => set("message", e.target.value)} />
        </Field>
      </div>

      {status === "error" && error && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}


      <Turnstile
        onVerify={setCaptchaToken}
        onExpire={() => setCaptchaToken(null)}
        className="mt-5"
      />

      <button
        type="submit"
        disabled={status === "submitting" || !captchaToken}
        className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:shadow-glow-teal disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send sponsorship inquiry"}
      </button>
    </form>
  );
}

