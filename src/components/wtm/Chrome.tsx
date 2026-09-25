import { Link, useNavigate } from "@tanstack/react-router";
import { useSession, useIsAdmin } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutDashboard, ShieldCheck, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";

function getUserFirstName(user: NonNullable<ReturnType<typeof useSession>["user"]>): string {
  const meta = user.user_metadata || {};
  const raw =
    meta.first_name ||
    meta.given_name ||
    meta.full_name ||
    meta.name ||
    user.email?.split("@")[0] ||
    "";
  return raw.split(" ")[0].trim() || user.email?.split("@")[0] || "?";
}


export function Header() {
  const linkCls = "text-sm font-medium text-foreground/80 hover:text-primary transition-colors";
  const { user, loading } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="group flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-5 md:gap-7">
          <nav className="hidden items-center gap-5 md:flex md:gap-7" aria-label="Primary">
            <Link to="/" className={linkCls} activeOptions={{ exact: true }} activeProps={{ className: "text-sm font-medium text-primary" }}>Home</Link>
            <Link to="/calendar" search={{}} className={linkCls}>WTM Events</Link>
            <Link to="/sponsor" className={linkCls}>Sponsors</Link>
            <Link to="/host" className={linkCls}>Submit an Event</Link>
          </nav>
          {loading ? (
            <div className="h-8 w-20 rounded-full bg-surface/50" />
          ) : user ? (
            <AccountMenu
              firstName={getUserFirstName(user)}
              email={user.email ?? ""}
              userId={user.id}
            />
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-background transition-all hover:bg-white/90 hover:shadow-glow-teal"
            >
              Sign in
            </Link>
          )}
          <MobileNav hasUser={!!user} />
        </div>
      </div>
    </header>
  );
}

function MobileNav({ hasUser }: { hasUser: boolean }) {
  const [open, setOpen] = useState(false);
  const itemCls = "flex items-center rounded-lg px-3 py-3 text-base font-medium text-foreground/90 hover:bg-surface/60 hover:text-primary transition-colors";
  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/60 text-foreground hover:border-primary/50"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85%] sm:max-w-sm border-border bg-background/95 backdrop-blur-xl p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex items-center border-b border-border/60 px-5 py-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-primary">Menu</span>
          </div>
          <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
            <Link to="/" onClick={() => setOpen(false)} className={itemCls}>Home</Link>
            <Link to="/calendar" search={{}} onClick={() => setOpen(false)} className={itemCls}>WTM Events</Link>
            <Link to="/sponsor" onClick={() => setOpen(false)} className={itemCls}>Sponsors</Link>
            <Link to="/host" onClick={() => setOpen(false)} className={itemCls}>Submit an Event</Link>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}


function AccountMenu({
  firstName,
  email,
  userId,
}: {
  firstName: string;
  email: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useIsAdmin(userId);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initial = (firstName[0] || email[0] || "?").toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-2 py-1.5 hover:border-primary/50"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/20 font-mono text-xs font-bold text-primary">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate font-mono text-[11px] font-semibold uppercase tracking-widest text-foreground sm:inline">
          {firstName}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur-xl">
          <div className="border-b border-border/50 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{firstName}</p>
            <p className="mt-0.5 max-w-[200px] truncate font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {email}
            </p>
          </div>
          <Link
            to="/host/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface/60"
          >
            <LayoutDashboard className="h-4 w-4 text-primary" /> Host account
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface/60"
            >
              <ShieldCheck className="h-4 w-4 text-primary" /> Admin dashboard
            </Link>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 border-t border-border/50 px-4 py-2.5 text-left text-sm hover:bg-surface/60"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Logo({ className = "h-9 w-auto md:h-10" }: { className?: string }) {
  return (
    <img
      src={"/wtm-logo-white.png"}
      alt="Wisconsin Tech Month"
      width={944}
      height={412}
      className={className}
    />
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo className="h-11 w-auto md:h-12" />
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">Building Wisconsin's tech ecosystem and reach.</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-primary">witechmonth.com</p>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Explore</div>
          <ul className="mt-3 space-y-2 text-sm">
            
            <li><Link to="/calendar" search={{}} className="hover:text-primary">Event calendar</Link></li>
            <li><Link to="/sponsor" className="hover:text-primary">Become a sponsor</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">For hosts</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/host" className="hover:text-primary">Submit event</Link></li>
            <li><Link to="/host/dashboard" className="hover:text-primary">Host account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        © 2026 Wisconsin Tech Month
      </div>
    </footer>
  );
}
