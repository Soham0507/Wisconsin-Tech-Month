import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState<boolean>(!!userId);
  useEffect(() => {
    if (!userId) { setIsAdmin(false); setLoading(false); return; }
    let active = true;
    setLoading(true);
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).then(({ data }) => {
      if (!active) return;
      setIsAdmin(!!data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);
  return { isAdmin, loading };
}
