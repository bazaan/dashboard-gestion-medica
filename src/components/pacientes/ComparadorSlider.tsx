"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  urlAntes: string;
  urlDespues: string;
  label?: string;
  autoPlay?: boolean;
}

export function ComparadorSlider({ urlAntes, urlDespues, label, autoPlay = true }: Props) {
  const [pos, setPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const hasInteractedRef = useRef(false);

  function updatePos(clientX: number) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPos((x / rect.width) * 100);
  }

  function startInteraction(clientX: number) {
    draggingRef.current = true;
    setIsDragging(true);
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
      setHasInteracted(true);
    }
    updatePos(clientX);
  }

  function stopInteraction() {
    draggingRef.current = false;
    setIsDragging(false);
  }

  // Auto-sweep cinematográfico al montar
  useEffect(() => {
    if (!autoPlay) return;
    const t1 = setTimeout(() => { if (!hasInteractedRef.current) setPos(10); }, 300);
    const t2 = setTimeout(() => { if (!hasInteractedRef.current) setPos(88); }, 1300);
    const t3 = setTimeout(() => { if (!hasInteractedRef.current) setPos(50); }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const easing = isDragging || hasInteracted ? "none" : "left 1.0s cubic-bezier(0.4,0,0.2,1)";
  const clipEasing = isDragging || hasInteracted ? "none" : "clip-path 1.0s cubic-bezier(0.4,0,0.2,1)";

  // Opacidad de los labels según posición
  const antesOpacity = Math.max(0, Math.min(1, (pos - 8) / 20));
  const despuesOpacity = Math.max(0, Math.min(1, (92 - pos) / 20));

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          {label}
        </p>
      )}

      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] overflow-hidden cursor-col-resize select-none rounded-2xl"
        style={{
          boxShadow:
            "0 0 0 1px rgba(169,141,103,0.25), 0 32px 80px rgba(0,0,0,0.75), inset 0 0 0 0 transparent",
        }}
        onMouseDown={(e) => startInteraction(e.clientX)}
        onMouseMove={(e) => { if (draggingRef.current) updatePos(e.clientX); }}
        onMouseUp={stopInteraction}
        onMouseLeave={stopInteraction}
        onTouchStart={(e) => startInteraction(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (draggingRef.current) {
            updatePos(e.touches[0].clientX);
            e.preventDefault();
          }
        }}
        onTouchEnd={stopInteraction}
      >
        {/* ── ANTES ────────────────────────────────── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlAntes}
          alt="Antes"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Vignette ANTES */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* ── DESPUÉS (clip path) ───────────────────── */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(0 ${100 - pos}% 0 0)`,
            transition: clipEasing,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlDespues}
            alt="Después"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
          {/* Vignette DESPUÉS */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* ── DIVISOR + HANDLE ─────────────────────── */}
        <div
          className="absolute top-0 bottom-0 z-20 pointer-events-none"
          style={{
            left: `${pos}%`,
            transform: "translateX(-50%)",
            transition: easing,
          }}
        >
          {/* Línea con glow dorado */}
          <div
            className="absolute inset-y-0 w-[1.5px] left-1/2 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, #d4b896 6%, #a98d67 20%, #c4a882 50%, #a98d67 80%, #d4b896 94%, transparent 100%)",
              boxShadow: isDragging
                ? "0 0 18px rgba(169,141,103,1), 0 0 50px rgba(169,141,103,0.55)"
                : "0 0 8px rgba(169,141,103,0.75), 0 0 24px rgba(169,141,103,0.3)",
              transition: "box-shadow 0.25s",
            }}
          />

          {/* Handle circular dorado */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 pointer-events-auto">
            {/* Halo exterior pulsante */}
            {!hasInteracted && (
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "-14px",
                  border: "1px solid rgba(169,141,103,0.35)",
                  animation: "ping 2.2s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
            )}
            {/* Glow difuso */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                inset: "-10px",
                background:
                  "radial-gradient(circle, rgba(169,141,103,0.22) 0%, transparent 70%)",
                opacity: isDragging ? 1 : 0.55,
                transition: "opacity 0.2s",
              }}
            />
            {/* Círculo principal */}
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(150deg, #dfc9a8 0%, #b8976c 35%, #a98d67 60%, #7d6849 100%)",
                boxShadow: isDragging
                  ? "0 0 0 2.5px rgba(255,255,255,0.18), 0 0 0 5px rgba(169,141,103,0.35), 0 0 36px rgba(169,141,103,0.7), 0 8px 28px rgba(0,0,0,0.55)"
                  : "0 0 0 1.5px rgba(255,255,255,0.12), 0 0 0 3px rgba(169,141,103,0.22), 0 0 22px rgba(169,141,103,0.45), 0 4px 18px rgba(0,0,0,0.45)",
                transform: isDragging ? "scale(1.12)" : "scale(1)",
                transition: "box-shadow 0.2s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            >
              {/* Flechas SVG */}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M8 6L3.5 11L8 16"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 6L18.5 11L14 16"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── LABEL ANTES ──────────────────────────── */}
        <div
          className="absolute left-5 bottom-5 z-30 pointer-events-none"
          style={{ opacity: antesOpacity, transition: "opacity 0.35s" }}
        >
          <div
            className="px-4 py-2 rounded-full"
            style={{
              background: "rgba(10,10,10,0.7)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-white text-[11px] font-bold tracking-[0.22em] uppercase">
              Antes
            </span>
          </div>
        </div>

        {/* ── LABEL DESPUÉS ────────────────────────── */}
        <div
          className="absolute right-5 bottom-5 z-30 pointer-events-none"
          style={{ opacity: despuesOpacity, transition: "opacity 0.35s" }}
        >
          <div
            className="px-4 py-2 rounded-full"
            style={{
              background: "rgba(169,141,103,0.8)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(169,141,103,0.35)",
            }}
          >
            <span className="text-white text-[11px] font-bold tracking-[0.22em] uppercase">
              Después
            </span>
          </div>
        </div>

        {/* ── HINT inicial ─────────────────────────── */}
        {!hasInteracted && (
          <div
            className="absolute inset-x-0 bottom-16 flex justify-center z-30 pointer-events-none"
            style={{ animation: "pulse 2.5s ease-in-out infinite" }}
          >
            <div
              className="px-3.5 py-1.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-white/55 text-[10px] tracking-[0.22em] uppercase font-medium">
                Arrastra para comparar
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
