"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot, Instagram, MessageCircle, Power, PowerOff,
  Activity, MessageSquare, ArrowRightLeft, AlertCircle,
  RefreshCw, Loader2, Zap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";

const AGENT_URL = "https://agente-dennisse.alef.company";
const AGENT_INTERNAL = "http://173.249.59.135:8091";

type AgentStats = {
  ai_enabled: boolean;
  ig_enabled: boolean;
  wa_enabled: boolean;
  model: string;
  active_conversations: number;
  messages_received: number;
  messages_responded: number;
  handoffs: number;
  errors: number;
  started_at: string | null;
};

type HealthData = {
  status: string;
  agent: string;
  version: string;
  ai_enabled: boolean;
  ig_enabled: boolean;
  wa_enabled: boolean;
  model: string;
  inbox_ig: number;
  inbox_wa: number;
  stats: {
    messages_received: number;
    messages_responded: number;
    handoffs: number;
    errors: number;
    started_at: string | null;
  };
};

export default function AgenteIAPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [healthRes, statsRes] = await Promise.all([
        fetch("/staff/api/agent/proxy?path=health"),
        fetch("/staff/api/agent/proxy?path=api/stats"),
      ]);

      if (healthRes.ok) {
        const h = await healthRes.json();
        setHealth(h);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (e: any) {
      setError("No se pudo conectar con el agente");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function toggleChannel(channel: "global" | "ig" | "wa") {
    setToggling(channel);
    try {
      const body: any = {};
      if (channel === "global") body.enabled = !health?.ai_enabled;
      if (channel === "ig") body.ig_enabled = !health?.ig_enabled;
      if (channel === "wa") body.wa_enabled = !health?.wa_enabled;

      const res = await fetch("/staff/api/agent/proxy?path=api/ai/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setHealth(prev => prev ? { ...prev, ai_enabled: data.ai_enabled, ig_enabled: data.ig_enabled, wa_enabled: data.wa_enabled } : prev);
        toast.success(`IA ${channel === "global" ? "global" : channel.toUpperCase()} ${data[channel === "global" ? "ai_enabled" : `${channel}_enabled`] ? "activada" : "desactivada"}`);
      } else {
        toast.error("Error al cambiar estado");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setToggling(null);
    }
  }

  const uptime = stats?.started_at
    ? (() => {
        const diff = Date.now() - new Date(stats.started_at).getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      })()
    : "—";

  return (
    <RoleGuard allowed={["admin"]}>
      <div className="min-h-full bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
            <div className="flex items-center gap-2.5">
              <Bot className="w-4 h-4 text-primary/60" />
              <span className="font-serif text-sm md:text-base font-semibold">Agente IA</span>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 border border-border transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </header>

        <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto space-y-6">
          <div className="fade-up">
            <p className="label-elegant mb-1.5">Control del Agente</p>
            <h2 className="font-serif text-xl md:text-2xl font-semibold">Carla — Asistente IA</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Agente de Instagram y WhatsApp para la Clinica Dra. Dennisse Arroyo
            </p>
            <div className="gold-rule mt-4" />
          </div>

          {error && (
            <div className="card-premium p-4 border-l-4 border-l-red-400">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading && !health ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
              <span className="ml-3 text-sm text-muted-foreground">Conectando con el agente...</span>
            </div>
          ) : health && (
            <>
              {/* Status banner */}
              <div className={`card-premium p-5 border-l-4 ${health.ai_enabled ? "border-l-emerald-400" : "border-l-red-400"}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${health.ai_enabled ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      {health.ai_enabled ? <Zap className="w-5 h-5 text-emerald-600" /> : <PowerOff className="w-5 h-5 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{health.ai_enabled ? "Agente Activo" : "Agente Desactivado"}</p>
                      <p className="text-xs text-muted-foreground">
                        v{health.version} · {health.model} · Uptime: {uptime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleChannel("global")}
                    disabled={toggling === "global"}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      health.ai_enabled
                        ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    } disabled:opacity-50`}
                  >
                    {toggling === "global" ? <Loader2 className="w-4 h-4 animate-spin" /> : health.ai_enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    {health.ai_enabled ? "Desactivar Todo" : "Activar Todo"}
                  </button>
                </div>
              </div>

              {/* Channel toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Instagram */}
                <div className="card-premium p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${health.ig_enabled ? "bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200" : "bg-gray-50 border border-gray-200"}`}>
                        <Instagram className={`w-5 h-5 ${health.ig_enabled ? "text-purple-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Instagram</p>
                        <p className="text-xs text-muted-foreground">Inbox {health.inbox_ig} · @dradennissearroyo.derma</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleChannel("ig")}
                      disabled={toggling === "ig" || !health.ai_enabled}
                      className="relative"
                      title={!health.ai_enabled ? "Activa el agente global primero" : ""}
                    >
                      {toggling === "ig" ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className={`w-12 h-7 rounded-full transition-all duration-300 flex items-center px-0.5 ${
                          health.ig_enabled && health.ai_enabled ? "bg-emerald-500" : "bg-gray-300"
                        } ${!health.ai_enabled ? "opacity-50" : "cursor-pointer"}`}>
                          <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            health.ig_enabled && health.ai_enabled ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </div>
                      )}
                    </button>
                  </div>
                  <div className={`text-xs px-3 py-2 rounded-lg ${health.ig_enabled && health.ai_enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                    {health.ig_enabled && health.ai_enabled ? "Carla responde DMs de Instagram" : "IA desactivada en Instagram"}
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="card-premium p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${health.wa_enabled && health.inbox_wa > 0 ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                        <MessageCircle className={`w-5 h-5 ${health.wa_enabled && health.inbox_wa > 0 ? "text-green-600" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">
                          {health.inbox_wa > 0 ? `Inbox ${health.inbox_wa}` : "No conectado"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleChannel("wa")}
                      disabled={toggling === "wa" || !health.ai_enabled || health.inbox_wa === 0}
                      title={health.inbox_wa === 0 ? "WhatsApp aun no conectado" : !health.ai_enabled ? "Activa el agente global primero" : ""}
                    >
                      {toggling === "wa" ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <div className={`w-12 h-7 rounded-full transition-all duration-300 flex items-center px-0.5 ${
                          health.wa_enabled && health.ai_enabled && health.inbox_wa > 0 ? "bg-emerald-500" : "bg-gray-300"
                        } ${(!health.ai_enabled || health.inbox_wa === 0) ? "opacity-50" : "cursor-pointer"}`}>
                          <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            health.wa_enabled && health.ai_enabled && health.inbox_wa > 0 ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </div>
                      )}
                    </button>
                  </div>
                  <div className={`text-xs px-3 py-2 rounded-lg ${
                    health.inbox_wa === 0
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : health.wa_enabled && health.ai_enabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-50 text-gray-500 border border-gray-200"
                  }`}>
                    {health.inbox_wa === 0 ? "Pendiente: conectar WhatsApp al agente" : health.wa_enabled && health.ai_enabled ? "Carla responde WhatsApp" : "IA desactivada en WhatsApp"}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Recibidos", value: stats.messages_received, icon: MessageSquare, color: "text-foreground" },
                    { label: "Respondidos", value: stats.messages_responded, icon: Bot, color: "text-emerald-600" },
                    { label: "Derivaciones", value: stats.handoffs, icon: ArrowRightLeft, color: "text-amber-600" },
                    { label: "Errores", value: stats.errors, icon: AlertCircle, color: "text-red-600" },
                    { label: "Conv. activas", value: stats.active_conversations, icon: Activity, color: "text-blue-600" },
                  ].map((s, i) => (
                    <div key={i} className="card-premium p-4 text-center">
                      <s.icon className="w-4 h-4 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className={`text-2xl font-serif font-semibold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Info */}
              <div className="card-premium p-5">
                <p className="label-elegant mb-3">Configuracion</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Modelo IA</span>
                    <span className="font-mono text-xs">{health.model}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-mono text-xs">v{health.version}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Inbox IG</span>
                    <span className="font-mono text-xs">{health.inbox_ig}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Inbox WA</span>
                    <span className="font-mono text-xs">{health.inbox_wa || "No configurado"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Debounce</span>
                    <span className="font-mono text-xs">28s</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Memoria</span>
                    <span className="font-mono text-xs">12 msgs / 1h TTL</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
