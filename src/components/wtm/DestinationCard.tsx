import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl: string;
  dates: string;
  name: string;
  theme: string;
  href: string;
  themeColor: string; // any CSS color string, e.g. "var(--week-1)"
}

export const DestinationCard = React.forwardRef<HTMLDivElement, DestinationCardProps>(
  ({ className, imageUrl, dates, name, theme, href, themeColor, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{ ["--theme-color" as any]: themeColor } as React.CSSProperties}
        className={cn("group relative h-[420px] w-full overflow-hidden rounded-2xl border border-border/60 bg-surface/40", className)}
        {...props}
      >
        {/* Background image with parallax zoom */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
          style={{ backgroundImage: `url(${imageUrl})` }}
          aria-hidden
        />

        {/* Base darkening + themed gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" aria-hidden />
        <div
          className="absolute inset-0 opacity-70 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-90"
          style={{
            background:
              "linear-gradient(180deg, transparent 40%, color-mix(in oklab, var(--theme-color) 70%, black) 100%)",
          }}
          aria-hidden
        />

        {/* Top accent line */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] transition-all group-hover:h-[3px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--theme-color) 50%, transparent 100%)",
            boxShadow: "0 0 12px var(--theme-color)",
          }}
          aria-hidden
        />

        {/* Content */}
        <div className="relative flex h-full flex-col justify-end p-6">
          <div
            className="font-mono text-[11px] uppercase tracking-widest"
            style={{ color: "var(--theme-color)" }}
          >
            {dates}
          </div>
          <div className="mt-2 font-display text-2xl font-bold leading-tight text-white">
            {name}
          </div>
          <p className="mt-2 max-w-xs text-sm text-white/80">{theme}</p>

          <Link
            to={href}
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white backdrop-blur-md transition-all hover:border-white/60 hover:bg-white/20"
          >
            Explore
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );
  }
);
DestinationCard.displayName = "DestinationCard";
