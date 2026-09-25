import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Header, Footer } from "@/components/wtm/Chrome";
import { WovenLightHero } from "@/components/wtm/WovenLightHero";
import { WEEKS, type WeekKey } from "@/lib/wtm-data";
import { subscribeNewsletter } from "@/lib/newsletter.functions";
import { Turnstile } from "@/lib/turnstile";
import {
  ContainerScroll,
  ContainerSticky,
  GalleryContainer,
  GalleryCol,
} from "@/components/wtm/ScrollGallery";

import { ArrowRight, Mail } from "lucide-react";
import weekMkeImgAsset from "@/assets/week-mke.png.asset.json";
import weekDevImgAsset from "@/assets/week-dev.png.asset.json";
import weekWitImgAsset from "@/assets/week-wit.png.asset.json";
import weekMidwestImgAsset from "@/assets/week-midwest.png.asset.json";
import g1 from "@/assets/gallery-9-115a3713.jpg.asset.json";
import g2 from "@/assets/gallery-14-115a3749.jpg.asset.json";
import g3 from "@/assets/gallery-18-115a3783.jpg.asset.json";
import g4 from "@/assets/gallery-30-115a3845.jpg.asset.json";
import g5 from "@/assets/gallery-115a2269.jpg.asset.json";
import g6 from "@/assets/gallery-115a2331.jpg.asset.json";
import g7 from "@/assets/gallery-wtm-womens.jpeg.asset.json";
import g8 from "@/assets/gallery-115a2356.jpg.asset.json";
import { toast } from "sonner";
import spSheldon from "@/assets/sheldon-cuffie.jpg.asset.json";
import spSamantha from "@/assets/samantha-maldonado.jpg.asset.json";
import spTim from "@/assets/tim-dickinson.jpg.asset.json";


export const Route = createFileRoute("/about")({
  head: () => {
    const title = "About Wisconsin Tech Month 2026";
    const desc =
      "Wisconsin Tech Month is a statewide, month-long celebration of the people, companies, and communities building the future of tech across Wisconsin and the Midwest.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: AboutPage,
});

const SLUGS: Record<keyof typeof WEEKS, string> = {
  w1: "mke-tech-week",
  w2: "dev-week",
  w3: "women-in-tech-week",
  w4: "midwest-tech-week",
};

const WEEK_IMAGE: Record<WeekKey, string> = {
  w1: weekMkeImgAsset.url,
  w2: weekDevImgAsset.url,
  w3: weekWitImgAsset.url,
  w4: weekMidwestImgAsset.url,
};

function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        
        <FeaturedProgramming />
        <FeaturedSpeakers />
        <MomentsGallery />
        <NewsletterCTA />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  return (
    <WovenLightHero
      headline="Innovation starts here."
      subhead="A statewide, month-long celebration of the founders, engineers, and communities building the future of tech across Wisconsin and the Midwest."
      ctaLabel="Explore WTM 2026"
      onCtaClick={() => navigate({ to: "/calendar", search: {} })}
    />
  );
}



function FeaturedProgramming() {
  return (
    <section className="border-b border-border/50 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-primary">Featured programming</div>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Upcoming weeks through October&nbsp;</h2>
          </div>
          <Link to="/calendar" search={{}} className="hidden font-mono text-[11px] uppercase tracking-widest text-primary hover:underline md:block">
            Full calendar →
          </Link>
        </div>
        <div className="mt-10 flex flex-col gap-4">
          {(Object.entries(WEEKS) as [keyof typeof WEEKS, typeof WEEKS["w1"]][]).map(([key, w]) => (
            <div
              key={key}
              className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-5"
            >
              {/* Date pill (outside the card, left on desktop, top on mobile) */}
              <div className="flex md:w-32 md:shrink-0 md:items-center md:justify-end">
                <div
                  className="inline-flex w-fit items-center gap-2 rounded-full border bg-background/40 px-3 py-1 font-mono text-[10px] uppercase tracking-widest md:px-2.5 md:py-0.5"
                  style={{ borderColor: w.color, color: w.color }}
                >
                  {w.dates}
                </div>
              </div>

              <Link
                to="/week/$slug"
                params={{ slug: SLUGS[key] }}
                className="card-constellation group relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border/60 transition-colors hover:border-primary/40 md:h-28 md:flex-row md:items-stretch"
                style={{ ["--week-accent" as string]: w.color }}
              >
                {/* Image (top on mobile, right on desktop) */}
                <div className="relative order-first h-20 w-full overflow-hidden md:order-last md:h-full md:w-[40%]">
                  <img
                    src={WEEK_IMAGE[key]}
                    alt=""
                    className="h-full w-full object-cover opacity-60 transition-all duration-500 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent, black 70%)",
                      maskImage:
                        "linear-gradient(to bottom, transparent, black 70%)",
                    }}
                  />
                  {/* Desktop mask override */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 hidden md:block"
                    style={{
                      background:
                        "linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 30%, transparent 75%)",
                    }}
                  />
                </div>

                {/* Text */}
                <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-4 md:w-[60%] md:px-6 md:py-5">
                  <h3 className="font-display text-lg font-semibold group-hover:text-primary md:text-xl">
                    {w.name}
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground md:text-sm">{w.theme}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURED_SPEAKERS: { name: string; company: string; title?: string; photo: { url: string } }[] = [
  {
    name: "Sheldon Cuffie",
    company: "Cream City Cyber",
    title: "Founder & CEO",
    photo: spSheldon,
  },
  {
    name: "Samantha Maldonado",
    company: "i.c.stars",
    title: "Executive Director",
    photo: spSamantha,
  },
  {
    name: "Tim Dickinson",
    company: "REGAL REXNORD",
    title: "SVP & Chief Digital & Information Officer",
    photo: spTim,
  },
];

function FeaturedSpeakers() {
  return (
    <section className="border-b border-border/50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">Featured speakers</div>
        <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">2026  WTM featured speakers</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_SPEAKERS.map((s) => (
            <div key={s.name} className="group">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                <img
                  src={s.photo.url}
                  alt={`${s.name}, ${s.company}`}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-display text-xl font-semibold leading-tight">{s.name}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-primary">{s.company}</p>
                {s.title ? <p className="mt-1 text-sm text-muted-foreground">{s.title}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const GALLERY_COLS: { src: string; alt: string }[][] = [
  [
    { src: g1.url, alt: "Speaker on stage" },
    { src: g5.url, alt: "Networking at WTM" },
    { src: g8.url, alt: "Fireside chat audience" },
  ],
  [
    { src: g2.url, alt: "Panel discussion" },
    { src: g6.url, alt: "Fireside chat with Mayor Johnson" },
    { src: g4.url, alt: "Group selfie at WTM" },
  ],
  [
    { src: g3.url, alt: "Speaker with Direct Supply slide" },
    { src: g7.url, alt: "Women in Tech evening event" },
    { src: g1.url, alt: "Speaker addressing crowd" },
  ],
];

function GalleryTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-surface/40">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-auto w-full object-cover"
      />
    </div>
  );
}

function MomentsGallery() {
  return (
    <section className="border-b border-border/50 pt-16 md:pt-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
          Moments from WTM
        </div>
        <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">
          Find your tech community.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {"\n"}
        </p>
      </div>

      <ContainerScroll className="mt-10 h-[140vh]">
        <ContainerSticky>
          <GalleryContainer className="mx-auto max-w-6xl px-5">
            <GalleryCol yRange={["0%", "-12%"]}>
              {GALLERY_COLS[0].map((img, i) => (
                <GalleryTile key={`c0-${i}`} {...img} />
              ))}
            </GalleryCol>
            <GalleryCol yRange={["0%", "-22%"]} className="mt-8 md:mt-16">
              {GALLERY_COLS[1].map((img, i) => (
                <GalleryTile key={`c1-${i}`} {...img} />
              ))}
            </GalleryCol>
            <GalleryCol yRange={["0%", "-8%"]}>
              {GALLERY_COLS[2].map((img, i) => (
                <GalleryTile key={`c2-${i}`} {...img} />
              ))}
            </GalleryCol>
          </GalleryContainer>
        </ContainerSticky>
      </ContainerScroll>
    </section>
  );
}

function NewsletterCTA() {
  const subscribe = useServerFn(subscribeNewsletter);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!captchaToken) {
      toast.error("Please complete the captcha before subscribing.");
      return;
    }
    setPending(true);
    try {
      await subscribe({ data: { email: email.trim(), source: "about", captchaToken } });
      setDone(true);
      setEmail("");
      toast.success("You're on the list — welcome to WTM.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setCaptchaToken(null);
    } finally {
      setPending(false);
    }
  };


  return (
    <section id="newsletter" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary/5">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-6 font-display text-4xl font-bold md:text-5xl">
          Get updates for WTM 2026
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Find out about speakers, featured events, and receive updates about what's going throughout WTM.
        </p>
        <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 rounded-full border border-border bg-surface/40 px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || done || !captchaToken}
            className="rounded-full bg-primary px-6 py-3 font-mono text-[11px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {done ? "Subscribed" : pending ? "Subscribing…" : "Notify me"}
          </button>
        </form>
        <div className="mt-5 flex justify-center">
          <Turnstile
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
          />
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Unsubscribe anytime · witechmonth.com
        </p>

      </div>
    </section>
  );
}
