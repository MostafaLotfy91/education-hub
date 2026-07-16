import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    role: null,
  });

  useEffect(() => {
    let active = true;

    const loadRole = async (userId: string): Promise<AppRole | null> => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      return (data?.role as AppRole | undefined) ?? null;
    };

    const applySession = async (session: Session | null) => {
      if (!active) return;
      if (!session?.user) {
        setState({ loading: false, session: null, user: null, role: null });
        return;
      }
      const role = await loadRole(session.user.id);
      if (!active) return;
      setState({ loading: false, session, user: session.user, role });
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      void applySession(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
