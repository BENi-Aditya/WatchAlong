import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SUPABASE_URL, supabase } from "@/lib/supabase";

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
  try {
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

    console.log("Ensuring profile for user:", authUser.id, "username:", desiredUsername);

    const { error } = await supabase.from("profiles").upsert({
      id: authUser.id,
      username: desiredUsername,
      avatar_url: avatarFromMeta,
    }, { onConflict: "id" });

    if (error) {
      console.error("Profile upsert error:", error);
      // Don't throw - just log and continue
    }

    return authUser;
  } catch (e) {
    console.error("ensureProfile error:", e);
    return null;
  }
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

async function preflightSupabase(timeoutMs = 4500) {
  // Skip preflight when using proxy - proxy bypasses ISP blocks
  // The proxy URL indicates we're already routing through Vercel
  const isUsingProxy = String(SUPABASE_URL).includes('/api/supabase');
  if (isUsingProxy) {
    console.log("Using proxy - skipping direct Supabase health check");
    return;
  }
  
  const ctrl = new AbortController();
  const timeout = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `${String(SUPABASE_URL).replace(/\/$/, "")}/auth/v1/health`;
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Supabase is unreachable");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    if (/abort/i.test(msg)) {
      throw new Error("Supabase is not reachable from your network (timeout). If you're in India, try switching networks or use the app's custom Supabase domain.");
    }
    throw new Error("Supabase is not reachable from your network. If you're in India, try switching networks or use the app's custom Supabase domain.");
  } finally {
    window.clearTimeout(timeout);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      console.log("Auth refresh: getting session...");
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes.session;
      console.log("Auth refresh: session =", session ? "found" : "not found");
      
      setToken(session?.access_token || null);
      if (!session?.user) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Try to ensure profile exists, but don't fail auth if it does
      try {
        await ensureProfile();
      } catch (profileErr) {
        console.error("Profile creation failed, continuing anyway:", profileErr);
      }

      // Load profile, use fallbacks if it fails
      let profile = { username: `User ${session.user.id.slice(0, 5)}`, avatarUrl: null };
      try {
        profile = await loadProfile(session.user.id);
      } catch (loadErr) {
        console.error("Profile load failed, using fallback:", loadErr);
      }
      
      setUser({
        id: session.user.id,
        email: session.user.email || "",
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      });
      console.log("Auth refresh: user set successfully");
    } catch (e) {
      console.error("Auth refresh failed:", e);
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
    await preflightSupabase();
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
