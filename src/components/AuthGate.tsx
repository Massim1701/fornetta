"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) setReady(true);
        return;
      }

      const { error } = await supabase.auth.signInAnonymously();
      if (!cancelled) {
        if (error) {
          setError(error.message);
        } else {
          setReady(true);
        }
      }
    }

    ensureSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="font-medium text-red-600">Anmeldung fehlgeschlagen</p>
          <p className="text-sm text-neutral-500">{error}</p>
          <p className="text-sm text-neutral-500">
            Prüfe, ob &quot;Anonymous Sign-ins&quot; im Supabase-Projekt unter Authentication →
            Providers aktiviert ist.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-sm text-neutral-500">Verbinde…</p>
      </div>
    );
  }

  return <>{children}</>;
}
