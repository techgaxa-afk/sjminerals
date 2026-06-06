import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AUTH_ERROR_EVENT = "lovable:auth-error";

type AuthErrorDetail = { message: string };

// Patch fetch once to detect auth/session restore failures (e.g. invalid refresh token).
let patched = false;
function installFetchInterceptor() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await orig(...args);
    try {
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
            ? args[0].url
            : (args[0] as URL).toString();
      if (
        !res.ok &&
        url.includes("/auth/v1/token") &&
        url.includes("grant_type=refresh_token")
      ) {
        const clone = res.clone();
        const body = await clone.json().catch(() => ({}) as any);
        const code = body?.code ?? body?.error ?? "";
        const message =
          body?.message ?? "Your session has expired. Please sign in again.";
        if (
          String(code).includes("refresh_token") ||
          /refresh token/i.test(message)
        ) {
          window.dispatchEvent(
            new CustomEvent<AuthErrorDetail>(AUTH_ERROR_EVENT, {
              detail: { message },
            }),
          );
        }
      }
    } catch {
      // ignore
    }
    return res;
  };
}

export function SessionErrorBanner() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    installFetchInterceptor();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AuthErrorDetail>).detail;
      setError(detail?.message ?? "Your session has expired. Please sign in again.");
    };
    window.addEventListener(AUTH_ERROR_EVENT, handler);
    return () => window.removeEventListener(AUTH_ERROR_EVENT, handler);
  }, []);

  if (!error) return null;

  const handleReLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setError(null);
    window.location.assign("/login");
  };

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] border-b border-destructive/30 bg-destructive text-destructive-foreground shadow-md"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-sm">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <div className="flex-1">
          <span className="font-medium">Session expired.</span>{" "}
          <span className="opacity-90">{error} Please sign in again to continue.</span>
        </div>
        <button
          onClick={handleReLogin}
          className="rounded-md bg-background/10 px-3 py-1 text-xs font-medium ring-1 ring-background/30 transition hover:bg-background/20"
        >
          Sign in
        </button>
        <button
          aria-label="Dismiss"
          onClick={() => setError(null)}
          className="rounded-md p-1 transition hover:bg-background/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
