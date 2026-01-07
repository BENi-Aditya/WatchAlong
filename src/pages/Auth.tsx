import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";

const GoogleMark = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 48 48"
    className={className}
  >
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303C33.657 32.66 29.154 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691 12.86 19.5C14.635 15.108 18.938 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.133 0-9.622-3.314-11.28-7.946l-6.5 5.007C9.537 39.556 16.227 44 24 44Z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.07 12.07 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
    />
  </svg>
);

const Auth = () => {
  const { login, loginWithGoogle, register, token, isLoading } = useAuth();
  const [params] = useSearchParams();
  const nextPath = useMemo(() => params.get("next") || "/", [params]);
  const oauthError = useMemo(() => params.get("error"), [params]);
  const oauthErrorDescription = useMemo(() => params.get("error_description"), [params]);
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!token) return;
    navigate(nextPath, { replace: true });
  }, [isLoading, token, navigate, nextPath]);

  useEffect(() => {
    if (!oauthError && !oauthErrorDescription) return;
    toast.error(oauthErrorDescription || oauthError || "Google sign-in failed");
  }, [oauthError, oauthErrorDescription]);

  const submit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, username);
      }
      navigate(nextPath);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Authentication failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleLogin = async () => {
    setIsSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth?next=${encodeURIComponent(nextPath)}`;
      await loginWithGoogle(redirectTo);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Google sign-in failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-pink-300/20 dark:bg-pink-500/10 rounded-full blur-3xl float" />
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-yellow-200/20 dark:bg-yellow-500/10 rounded-full blur-3xl float" style={{ animationDelay: "2s" }} />
      </div>

      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-smooth">
            Back
          </button>
          <ThemeToggle />
        </div>
      </nav>

      <main className="relative z-10 px-6 pt-12">
        <div className="max-w-md mx-auto">
          <GlassCard className="p-8 animate-scale-in">
            <div className="flex gap-2 mb-6">
              <GlassButton
                variant={mode === "login" ? "primary" : "ghost"}
                className="flex-1"
                onClick={() => setMode("login")}
                type="button"
              >
                Sign In
              </GlassButton>
              <GlassButton
                variant={mode === "register" ? "primary" : "ghost"}
                className="flex-1"
                onClick={() => setMode("register")}
                type="button"
              >
                Create Account
              </GlassButton>
            </div>

            <div className="space-y-4">
              <>
                <GlassButton
                  className="w-full"
                  variant="outline"
                  size="lg"
                  onClick={googleLogin}
                  disabled={isSubmitting}
                  type="button"
                >
                  <span className="inline-flex items-center justify-center gap-3">
                    <GoogleMark className="h-5 w-5" />
                    <span>Continue with Google</span>
                  </span>
                </GlassButton>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <div className="text-xs text-muted-foreground">or</div>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>

              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Display name</label>
                  <GlassInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="How others will see you" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <GlassInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <GlassInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>

              <GlassButton className="w-full" size="lg" onClick={submit} disabled={isSubmitting}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
};

export default Auth;
