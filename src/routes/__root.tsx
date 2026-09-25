import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/wtm/ChatWidget";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wisconsin Tech Month 2026 — Connected Constellations" },
      { name: "description", content: "A statewide month of tech in October 2026. Explore events across Wisconsin's regions — startups, industry, community, talent." },
      { property: "og:title", content: "Wisconsin Tech Month 2026 — Connected Constellations" },
      { property: "og:description", content: "A statewide month of tech in October 2026. Explore events across Wisconsin's regions — startups, industry, community, talent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Wisconsin Tech Month 2026 — Connected Constellations" },
      { name: "twitter:description", content: "A statewide month of tech in October 2026. Explore events across Wisconsin's regions — startups, industry, community, talent." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c1e6a391-c1e2-4233-a7ef-3ec3693386fc/id-preview-085663ed--ad50bc9b-6b06-4b3f-90a7-79e9c26575e8.lovable.app-1781219735652.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c1e6a391-c1e2-4233-a7ef-3ec3693386fc/id-preview-085663ed--ad50bc9b-6b06-4b3f-90a7-79e9c26575e8.lovable.app-1781219735652.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Lazy import to keep this out of SSR / non-browser bundles.
    let unsub: (() => void) | undefined;
    import("../integrations/supabase/client").then(({ supabase }) => {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      unsub = () => data.subscription.unsubscribe();
    });
    return () => { unsub?.(); };
  }, [router, queryClient]);

  // Page view tracking (throttled per path per session per 5 minutes).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = "wtm_sid";
    let sid = window.localStorage.getItem(KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(KEY, sid);
    }
    const sessionId = sid;
    const seen = new Map<string, number>();

    const track = async () => {
      const path = window.location.pathname;
      // Skip admin/host pages to keep analytics focused on visitors.
      if (path.startsWith("/admin") || path.startsWith("/host") || path.startsWith("/auth")) return;
      const now = Date.now();
      const last = seen.get(path) ?? 0;
      if (now - last < 5 * 60 * 1000) return;
      seen.set(path, now);
      try {
        const { trackPageView } = await import("../lib/analytics.functions");
        await trackPageView({
          data: {
            path,
            session_id: sessionId,
            referrer: document.referrer || undefined,
          },
        });
      } catch {
        // ignore
      }
    };

    track();
    const unsub = router.subscribe("onResolved", () => { track(); });
    return () => { unsub(); };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <ChatWidget />
      <Toaster />
    </QueryClientProvider>
  );
}


