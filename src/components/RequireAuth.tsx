import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (token) return;
    nav(`/auth?next=${encodeURIComponent(location.pathname)}`, { replace: true });
  }, [isLoading, token, nav, location.pathname]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Redirecting to sign-in…</div>
      </div>
    );
  }
  return <>{children}</>;
}
