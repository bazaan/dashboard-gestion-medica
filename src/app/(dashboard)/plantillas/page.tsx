"use client";

import { useState } from "react";
import {
  MessageSquareText, Copy, Check, ChevronDown, ChevronUp,
  Info, Clock, AlertTriangle, CheckCircle2, Smartphone,
} from "lucide-react";

// ─── Definición canónica de las 3 plantillas ─────────────────────────────────
// Este es el texto EXACTO que se somete a Meta Business Manager.
// Sincronizar con reminders-service/templates.py si se modifica.

const BOTON_QR = { type: "QUICK_REPLY", text: "¡Agendemos! 📅" } as const;

const PLANTILLAS = [
  {
    id: "30d",
    tipo: "30 días",
    nombre_meta: "renovacion_recordatorio_30d",
    descripcion: "Se envía 30 días antes del vencimiento. Tono cálido, sin urgencia.",
    color_tipo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    color_icon: "text-emerald-500",
    icon: CheckCircle2,
    boton: BOTON_QR,
    texto: `Hola {{nombre}} 😊

Desde la *Clínica Dra. Dennisse Arroyo* queremos recordarte que tu tratamiento de *{{tratamiento}}* vencerá en 30 días, el {{fecha}}.

Renovar a tiempo es la clave para mantener los resultados que lograste. ¿Agendamos tu próxima sesión?

Escríbenos cuando gustes 🌟

_Responde STOP para dejar de recibir recordatorios._`,
  },
  {
    id: "7d",
    tipo: "7 días",
    nombre_meta: "renovacion_recordatorio_7d",
    descripcion: "Se envía 7 días antes. Tono más activo, genera urgencia suave.",
    color_tipo: "bg-amber-50 text-amber-700 border-amber-200",
    color_icon: "text-amber-500",
    icon: Clock,
    boton: BOTON_QR,
    texto: `Hola {{nombre}} 💫

Te recordamos de la *Clínica Dra. Dennisse Arroyo* que tu tratamiento de *{{tratamiento}}* vence en solo 7 días, el {{fecha}}.

Es el momento ideal para renovar y seguir luciendo los resultados que tanto te gustan. ¡Tenemos disponibilidad esta semana!

Escríbenos y te atendemos con gusto 🌸

_Responde STOP para dejar de recibir recordatorios._`,
  },
  {
    id: "venc",
    tipo: "Día de vencimiento",
    nombre_meta: "renovacion_vencimiento",
    descripcion: "Se envía el día que vence. Tono empático, enfocado en no perder resultados.",
    color_tipo: "bg-red-50 text-red-600 border-red-200",
    color_icon: "text-red-500",
    icon: AlertTriangle,
    boton: BOTON_QR,
    texto: `Hola {{nombre}} ✨

Te contactamos de la *Clínica Dra. Dennisse Arroyo*. Tu tratamiento de *{{tratamiento}}* llegó a su fecha de renovación el {{fecha}}.

¡Aún estás a tiempo de mantener tus resultados! Renovarlo ahora evita que los efectos disminuyan.

Escríbenos y con gusto te agendamos 💛

_Responde STOP para dejar de recibir recordatorios._`,
  },
] as const;

// ─── Renderer del texto de WhatsApp ──────────────────────────────────────────
// Interpreta *negrita*, _cursiva_, saltos de línea y variables {{n}}
function renderWAText(raw: string, vars: Record<string, string>) {
  let txt = raw;
  txt = txt.replace(/\{\{nombre\}\}/g, vars["nombre"] || "{{nombre}}");
  txt = txt.replace(/\{\{tratamiento\}\}/g, vars["tratamiento"] || "{{tratamiento}}");
  txt = txt.replace(/\{\{fecha\}\}/g, vars["fecha"] || "{{fecha}}");

  return txt.split("\n").map((line, li) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/^\*([^*]+)\*/);
      const italicMatch = remaining.match(/^_([^_]+)_/);
      const varMatch = remaining.match(/^(\{\{(?:nombre|tratamiento|fecha)\}\})/);

      if (boldMatch) {
        parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
      } else if (italicMatch) {
        parts.push(<em key={key++} className="italic text-[11px] opacity-80">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
      } else if (varMatch) {
        parts.push(<span key={key++} className="bg-primary/20 text-primary px-0.5 rounded font-mono text-[11px]">{varMatch[1]}</span>);
        remaining = remaining.slice(varMatch[0].length);
      } else {
        const next = remaining.search(/[*_]|\{\{(?:nombre|tratamiento|fecha)\}\}/);
        if (next === -1) { parts.push(<span key={key++}>{remaining}</span>); remaining = ""; }
        else { parts.push(<span key={key++}>{remaining.slice(0, next)}</span>); remaining = remaining.slice(next); }
      }
    }

    return <p key={li} className={li === 0 ? "" : "mt-1"}>{parts}</p>;
  });
}

// Resalta variables {{nombre}} etc. en el texto original (vista sin preview)
function highlightVars(text: string) {
  return text.split("\n").map((line, li) => {
    const parts = line.split(/(\{\{(?:nombre|tratamiento|fecha)\}\})/);
    return (
      <p key={li} className={li === 0 ? "" : "mt-1"}>
        {parts.map((part, pi) =>
          /^\{\{(?:nombre|tratamiento|fecha)\}\}$/.test(part)
            ? <span key={pi} className="inline-block bg-primary/15 text-primary font-mono text-[11px] px-1 py-0.5 rounded border border-primary/25">{part}</span>
            : <span key={pi}>{part}</span>
        )}
      </p>
    );
  });
}

// ─── Card de plantilla ────────────────────────────────────────────────────────
function PlantillaCard({ p }: { p: typeof PLANTILLAS[number] }) {
  const [copied, setCopied]       = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [vars, setVars] = useState({ "nombre": "María García", "tratamiento": p.id === "30d" ? "Hilos Delta Lifting®" : p.id === "7d" ? "Profhilo" : "Toxina Botulínica", "fecha": "15 de agosto de 2025" });

  const Icon = p.icon;

  function copyText() {
    navigator.clipboard.writeText(p.texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card-premium overflow-hidden">

      {/* Header de la card */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${p.color_tipo.replace("text-", "bg-").replace("-700", "-50").replace("-600", "-50")} shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${p.color_icon}`} />
            </div>
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${p.color_tipo}`}>
                {p.tipo}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{p.descripcion}</p>
            </div>
          </div>

          {/* Nombre Meta */}
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Nombre en Meta</p>
            <code className="text-xs font-mono bg-muted border border-border px-2 py-1 rounded">{p.nombre_meta}</code>
          </div>
        </div>

        {/* Badges de configuración */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">UTILITY</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">Idioma: es</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">3 variables</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            Quick Reply · {p.boton.text}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">Pendiente aprobación</span>
        </div>
      </div>

      {/* Texto de la plantilla */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Texto de la plantilla</p>
          <button
            onClick={copyText}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              copied ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-muted hover:bg-muted/80 text-foreground border border-border"
            }`}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar texto</>}
          </button>
        </div>

        {/* Texto con variables resaltadas */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 text-sm text-foreground leading-relaxed font-mono text-[13px]">
          {highlightVars(p.texto)}
        </div>

        {/* Botón de la plantilla */}
        <div className="mt-4 border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Botón interactivo</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">QUICK_REPLY</span>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 2 11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{p.boton.text}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Al tocar este botón, la paciente envía un mensaje de vuelta a Chatwoot → un agente puede responder directamente.
              </p>
            </div>
          </div>
        </div>

        {/* Leyenda de variables */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            { v: "{{nombre}}", desc: "Nombre del paciente" },
            { v: "{{tratamiento}}", desc: "Nombre del tratamiento" },
            { v: "{{fecha}}", desc: "Fecha de vencimiento" },
          ].map(({ v, desc }) => (
            <div key={v} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="bg-primary/15 text-primary font-mono text-[10px] px-1 py-0.5 rounded border border-primary/25">{v}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Previsualizador */}
      <div className="border-t border-border">
        <button
          onClick={() => setPreviewOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-muted/20 transition-colors text-left"
        >
          <Smartphone className="w-4 h-4 text-primary/60 shrink-0" />
          <span className="flex-1 text-sm font-medium text-foreground">Previsualizar mensaje</span>
          <span className="text-xs text-muted-foreground mr-2">Como lo verá la paciente en WhatsApp</span>
          {previewOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {previewOpen && (
          <div className="px-6 pb-6 pt-2 border-t border-border/60">
            {/* Inputs de variables */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                { key: "nombre", label: "{{nombre}} Nombre paciente", placeholder: "Ej. María García" },
                { key: "tratamiento", label: "{{tratamiento}} Tratamiento", placeholder: "Ej. Hilos Delta Lifting®" },
                { key: "fecha", label: "{{fecha}} Fecha", placeholder: "Ej. 15 de agosto de 2025" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    value={vars[key as keyof typeof vars]}
                    onChange={(e) => setVars((v) => ({ ...v, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Burbuja WhatsApp */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5ddd5'/%3E%3C/svg%3E\")", backgroundColor: "#e5ddd5" }}>
              <div className="px-4 py-5">
                {/* Barra superior simulada */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-black/10">
                  <div className="w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white text-xs font-bold shrink-0">D</div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Clínica Dra. Dennisse</p>
                    <p className="text-[10px] text-gray-500">WhatsApp Business</p>
                  </div>
                </div>

                {/* Burbuja del mensaje + botón Quick Reply */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] shadow-sm" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))" }}>
                    {/* Cuerpo del mensaje */}
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 relative">
                      <div className="absolute -left-2 top-0 w-0 h-0" style={{ borderTop: "8px solid white", borderLeft: "8px solid transparent" }} />
                      <div className="text-[13px] text-gray-800 leading-relaxed">
                        {renderWAText(p.texto, vars)}
                      </div>
                      <p className="text-[10px] text-gray-400 text-right mt-2">
                        {new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })} ✓✓
                      </p>
                    </div>
                    {/* Botón Quick Reply — separado, unido al bubble */}
                    <div className="bg-white rounded-b-2xl border-t border-gray-100 overflow-hidden mt-px">
                      <button
                        type="button"
                        className="w-full py-2.5 text-center text-[13px] font-semibold text-[#128C7E] hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="22 2 11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        {p.boton.text}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Guía de envío a Meta ─────────────────────────────────────────────────────
function GuiaMeta() {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-premium overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-muted/20 transition-colors text-left"
      >
        <Info className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 text-sm font-semibold text-foreground">Cómo someter las plantillas a Meta Business Manager</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-6 py-5 space-y-4">
          <ol className="space-y-3">
            {[
              { n: 1, text: "Ingresa a Meta Business Suite → WhatsApp Manager → Message Templates." },
              { n: 2, text: "Clic en «Create Template». Selecciona categoría UTILITY (no Marketing)." },
              { n: 3, text: "Idioma: Español (es) o Español Latinoamérica (es_419)." },
              { n: 4, text: "En el cuerpo del mensaje pega exactamente el texto de arriba. Para agregar variables escribe {{nombre}}, {{tratamiento}}, {{fecha}} — Meta las convierte automáticamente a parámetros." },
              { n: 5, text: "Nombre de la plantilla: usa el nombre exacto que aparece en «Nombre en Meta» (p.e. renovacion_recordatorio_30d). Solo letras minúsculas, números y guiones bajos." },
              { n: 6, text: "Enviar para revisión. El proceso toma entre 24 y 48 horas." },
              { n: 7, text: "Una vez aprobada, copia el nombre exacto al archivo .env del servicio de recordatorios (WA_TEMPLATE_30D, WA_TEMPLATE_7D, WA_TEMPLATE_VENCIMIENTO)." },
            ].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                <p className="text-sm text-foreground leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Importante</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Si Meta rechaza una plantilla, revisa que no tenga URLs, que el nombre del negocio esté claramente mencionado y que el mensaje no suene a publicidad genérica. Las plantillas UTILITY con contexto médico/de salud se aprueban bien.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">💡 Sobre el STOP</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              El texto «Responde STOP para dejar de recibir recordatorios» es obligatorio para cumplir con la política de opt-out de Meta. Si una paciente responde STOP, Chatwoot recibirá el mensaje — configura una automatización en Chatwoot para marcarlo y que el sistema no le envíe más recordatorios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PlantillasPage() {
  return (
    <div className="min-h-full bg-background">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2.5">
            <MessageSquareText className="w-4 h-4 text-primary/60" />
            <span className="font-serif text-sm md:text-base font-semibold">Plantillas de WhatsApp</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {PLANTILLAS.length} plantillas · Categoría UTILITY · Idioma es
          </span>
        </div>
      </header>

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl mx-auto space-y-6">

        {/* Título */}
        <div className="fade-up">
          <p className="label-elegant mb-1.5">Sistema de Recordatorios</p>
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="font-serif text-xl md:text-2xl font-semibold">Plantillas de WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              3 plantillas · <strong className="text-foreground">9 variables</strong> en total
            </p>
          </div>
          <div className="gold-rule mt-4" />
        </div>

        {/* Guía Meta */}
        <div className="fade-up stagger-1">
          <GuiaMeta />
        </div>

        {/* Plantillas */}
        <div className="space-y-5 fade-up stagger-2">
          {PLANTILLAS.map((p) => (
            <PlantillaCard key={p.id} p={p} />
          ))}
        </div>

        {/* Nota de sincronización */}
        <div className="card-premium p-5 border-l-4 border-l-primary/40 fade-up stagger-3">
          <p className="text-xs font-semibold text-foreground mb-1">Sincronización con el servicio Python</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Los textos aquí son el espejo de <code className="bg-muted px-1 rounded font-mono">reminders-service/templates.py</code>.
            Si modificas una plantilla aprobada y la re-sometes a Meta, actualiza también ese archivo para que el servicio use el mismo texto.
          </p>
        </div>

      </div>
    </div>
  );
}
