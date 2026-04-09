"use client";

import { Settings, Lock } from "lucide-react";

export default function ConfiguracionPage() {
  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2.5 px-4 md:px-8 h-14 md:h-16">
          <Settings className="w-4 h-4 text-primary/60" />
          <span className="font-serif text-sm md:text-base font-semibold text-foreground">
            Configuración
          </span>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto space-y-6">
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Sistema</p>
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground">
            Configuración del Sistema
          </h2>
          <div className="gold-rule mt-4" />
        </div>

        <div className="fade-up stagger-1 card-premium flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">Sección en construcción</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Esta sección estará disponible próximamente. Solo administradores tienen acceso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
