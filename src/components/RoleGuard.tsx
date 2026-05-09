"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldX } from "lucide-react";
import type { UserRole } from "@/types/database.types";

export function RoleGuard({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile && allowed.includes(profile.role)) {
        setState("allowed");
      } else {
        setState("denied");
      }
    };
    check();
  }, [allowed, router]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-serif text-lg font-semibold text-foreground">Acceso denegado</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          No tienes permisos para acceder a esta sección.
        </p>
        <button
          onClick={() => router.replace("/")}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
