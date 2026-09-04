import type { Session } from "@supabase/supabase-js";
import type { AuthProvider, AuthSession, SessionListener } from "../../application/ports/auth-provider";
import { supabase } from "./client";

function toDomain(session: Session | null): AuthSession | null {
  return session
    ? { userId: session.user.id, email: session.user.email ?? null, accessToken: session.access_token }
    : null;
}

export class SupabaseAuthProvider implements AuthProvider {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return toDomain(data.session);
  }

  async signInWithOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  onSessionChanged(listener: SessionListener) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(toDomain(session)));
    return () => data.subscription.unsubscribe();
  }
}
