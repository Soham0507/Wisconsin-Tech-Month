import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type InfiniteSliderProps = React.ComponentProps<"div"> & {
  /** Scroll speed in px per second. */
  speed?: number;
  /** Slower speed while hovering (px per second). */
  speedOnHover?: number;
  /** Gap between items in px. */
  gap?: number;
  reverse?: boolean;
};

export function InfiniteSlider({
  children,
  speed = 80,
  speedOnHover,
  gap = 42,
  reverse = false,
  className,
  ...props
}: InfiniteSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hoveringRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last: number | null = null;
    let offset = 0;

    const step = (t: number) => {
      const half = track.scrollWidth / 2;
      if (half > 0) {
        const prev = last ?? t;
        const dt = Math.min((t - prev) / 1000, 0.05);
        last = t;
        const px = hoveringRef.current && speedOnHover ? speedOnHover : speed;
        offset = (offset + (reverse ? px : -px) * dt) % half;
        if (offset > 0) offset -= half;
        track.style.transform = `translate3d(${offset}px, 0, 0)`;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [speed, speedOnHover, reverse]);

  return (
    <div
      {...props}
      className={cn("overflow-hidden py-4", className)}
      onMouseEnter={() => (hoveringRef.current = true)}
      onMouseLeave={() => (hoveringRef.current = false)}
    >
      <div
        ref={trackRef}
        className="flex w-max items-center will-change-transform"
        style={{ gap: `${gap}px` }}
      >
        {children}
        <div aria-hidden="true" className="contents">
          {children}
        </div>
      </div>
    </div>
  );
}

export default InfiniteSlider;
