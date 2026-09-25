import { useEffect, useRef, useState } from "react";

// Production Cloudflare Turnstile site key for witechmonth.com.
const PROD_SITE_KEY = "0x4AAAAAADy1oInz4wncEYAl";
// Cloudflare-provided "always passes" test key, used on non-production hostnames
// (Lovable previews, localhost) so the widget doesn't fail with error 110200
// ("domain not allowed"). Server verification uses the matching test secret.
const TEST_SITE_KEY = "1x00000000000000000000AA";

const PROD_HOSTS = new Set(["witechmonth.com", "www.witechmonth.com", "connected-constellations-hub.lovable.app"]);

function resolveSiteKey(): string {
  const override = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  if (override) return override;
  if (typeof window === "undefined") return PROD_SITE_KEY;
  return PROD_HOSTS.has(window.location.hostname) ? PROD_SITE_KEY : TEST_SITE_KEY;
}

export const TURNSTILE_SITE_KEY: string = resolveSiteKey();


declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Turnstile")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.dataset.turnstile = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

/** Cloudflare Turnstile widget. Emits a token via onVerify. */
export function Turnstile({ onVerify, onExpire, theme = "dark", className }: TurnstileProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          callback: (token) => onVerify(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => setError("Captcha failed to load. Please refresh."),
        });
      })
      .catch(() => setError("Captcha failed to load. Please refresh."));
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <div ref={ref} />
      {error && <div className="mt-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}
