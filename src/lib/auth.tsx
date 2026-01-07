import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type User = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (redirectTo: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureProfile() {
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return null;

  const meta = (authUser.user_metadata || {}) as Record<string, unknown>;
  const usernameFromMeta = typeof meta.username === "string" ? meta.username : null;
  const nameFromMeta =
    (typeof meta.full_name === "string" ? meta.full_name : null) ||
    (typeof meta.name === "string" ? meta.name : null);
  const emailFromMeta = typeof meta.email === "string" ? meta.email : null;
  const emailPrefix = (emailFromMeta || authUser.email || "").split("@")[0] || null;
  const fallbackUsername = `Guest ${authUser.id.slice(0, 5)}`;
  const desiredUsername = usernameFromMeta || nameFromMeta || emailPrefix || fallbackUsername;

  const avatarFromMeta =
    (typeof meta.avatar_url === "string" ? meta.avatar_url : null) ||
    (typeof meta.picture === "string" ? meta.picture : null);

  const { error } = await supabase.from("profiles").upsert({
    id: authUser.id,
    username: desiredUsername,
    avatar_url: avatarFromMeta,
  }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  return authUser;
}

async function loadProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return {
    username: data?.username || `User ${userId.slice(0, 5)}`,
    avatarUrl: (data?.avatar_url as string | null) || null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes.session;
      setToken(session?.access_token || null);
      if (!session?.user) {
        setUser(null);
        return;
      }

      await ensureProfile();
      const profile = await loadProfile(session.user.id);
      setUser({
        id: session.user.id,
        email: session.user.email || "",
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      });
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim()) throw new Error("Email is required");
    if (!password) throw new Error("Password is required");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await refresh();
  }, [refresh]);

  const loginWithGoogle = useCallback(async (redirectTo: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    if (!email.trim()) throw new Error("Email is required");
    if (!password) throw new Error("Password is required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    if (!username.trim()) throw new Error("Username is required");

    const emailRedirectTo = `${window.location.origin}/auth`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo,
      },
    });
    if (error) throw new Error(error.message);

    if (data.session) {
      await refresh();
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      if (/email not confirmed/i.test(signInError.message)) {
        throw new Error(
          "Email not confirmed. In Supabase: Authentication → Providers → Email, turn OFF email confirmations (then delete this unconfirmed user in Authentication → Users and sign up again)."
        );
      }
      throw new Error(signInError.message);
    }

    await refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    void supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    refresh,
  }), [user, token, isLoading, login, loginWithGoogle, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
