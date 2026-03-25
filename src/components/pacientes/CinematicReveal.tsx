"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw } from "lucide-react";

// ── Fotos demo de alta calidad (consistentes, siempre las mismas) ───────────
const DEMO_ANTES =
  "https://picsum.photos/seed/clinica-arroyo-antes/800/600";
const DEMO_DESPUES =
  "https://picsum.photos/seed/clinica-arroyo-despues/800/600";

// ── Estrella de 5 puntas (clip-path) ─────────────────────────────────────
const STAR_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

type StarPhase = "hidden" | "expanding" | "contracting";

interface Props {
  urlAntes?: string;
  urlDespues?: string;
  tratamiento?: string;
}

export function CinematicReveal({
  urlAntes = DEMO_ANTES,
  urlDespues = DEMO_DESPUES,
  tratamiento,
}: Props) {
  const [showing, setShowing] = useState<"antes" | "despues">("antes");
  const [starPhase, setStarPhase] = useState<StarPhase>("hidden");
  const [isAnimating, setIsAnimating] = useState(false);
  const hasAutoPlayed = useRef(false);

  const isExpanding = starPhase === "expanding";
  const isContracting = starPhase === "contracting";

  function playReveal() {
    if (isAnimating) return;
    setIsAnimating(true);
    setStarPhase("expanding");
  }

  function onExpandComplete() {
    // Estrella cubre todo — swap de imagen
    setShowing((prev) => (prev === "antes" ? "despues" : "antes"));
    setStarPhase("contracting");
  }

  function onContractComplete() {
    setStarPhase("hidden");
    setIsAnimating(false);
  }

  // Auto-play al montar (una sola vez)
  useEffect(() => {
    if (hasAutoPlayed.current) return;
    hasAutoPlayed.current = true;
    const t = setTimeout(playReveal, 1000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label-elegant mb-1">Demostración de Resultados</p>
          <h4 className="font-serif text-xl font-semibold text-foreground">
            {tratamiento ?? "Transformación · Antes & Después"}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Así se verán los resultados de tus pacientes en el sistema
          </p>
        </div>
        <button
          onClick={playReveal}
          disabled={isAnimating}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/6 hover:bg-primary/12 text-primary text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAnimating ? (
            <Sparkles className="w-4 h-4 animate-pulse" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          {isAnimating ? "Revelando…" : "Repetir animación"}
        </button>
      </div>

      {/* Frame principal */}
      <div
        className="relative w-full overflow-hidden rounded-2xl select-none"
        style={{
          aspectRatio: "16/9",
          boxShadow:
            "0 0 0 1px rgba(169,141,103,0.2), 0 12px 48px rgba(0,0,0,0.14)",
          cursor: isAnimating ? "default" : "pointer",
        }}
        onClick={() => { if (!isAnimating) playReveal(); }}
      >
        {/* ── Imagen activa ─────────────────────────────── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={showing === "antes" ? urlAntes : urlDespues}
          alt={showing === "antes" ? "Antes del tratamiento" : "Después del tratamiento"}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Vignette inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 pointer-events-none" />

        {/* ── Estrella de transición ─────────────────────── */}
        <motion.div
          className="absolute pointer-events-none z-20"
          style={{
            width: "180px",
            height: "180px",
            top: "50%",
            left: "50%",
            marginLeft: "-90px",
            marginTop: "-90px",
            clipPath: STAR_CLIP,
            background:
              "linear-gradient(145deg, #efe0c8 0%, #d4b896 25%, #c4a882 50%, #a98d67 75%, #7d6849 100%)",
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={
            isExpanding
              ? { scale: 24, rotate: 15 }
              : isContracting
              ? { scale: 0, rotate: -8 }
              : { scale: 0, rotate: 0 }
          }
          transition={
            isExpanding
              ? { duration: 0.68, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.52, ease: [0.64, 0, 0.78, 0] }
          }
          onAnimationComplete={
            isExpanding
              ? onExpandComplete
              : isContracting
              ? onContractComplete
              : undefined
          }
        />

        {/* ── Destellos radiales al expandir ────────────── */}
        {isExpanding && (
          <>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <motion.div
                key={deg}
                className="absolute pointer-events-none z-10"
                style={{
                  width: "2px",
                  height: "60px",
                  top: "50%",
                  left: "50%",
                  marginLeft: "-1px",
                  marginTop: "-30px",
                  background:
                    "linear-gradient(to bottom, transparent, rgba(169,141,103,0.7), transparent)",
                  transformOrigin: "center center",
                  transform: `rotate(${deg}deg)`,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 0], opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </>
        )}

        {/* ── Label Antes / Después ─────────────────────── */}
        <div className="absolute bottom-5 left-5 z-10">
          <motion.div
            key={showing}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div
              className="px-4 py-2 rounded-full"
              style={{
                background:
                  showing === "antes"
                    ? "rgba(10,10,10,0.72)"
                    : "rgba(169,141,103,0.85)",
                backdropFilter: "blur(14px)",
                border:
                  showing === "antes"
                    ? "1px solid rgba(255,255,255,0.1)"
                    : "1px solid rgba(169,141,103,0.45)",
              }}
            >
              <span className="text-white text-[11px] font-bold tracking-[0.22em] uppercase">
                {showing === "antes" ? "Antes" : "Después"}
              </span>
            </div>
          </motion.div>
        </div>

        {/* ── Indicador "Haz clic" (solo cuando no está animando) ── */}
        {!isAnimating && (
          <motion.div
            className="absolute bottom-5 right-5 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div
              className="px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span className="text-white/55 text-[10px] font-medium tracking-[0.18em] uppercase">
                Clic para revelar
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Indicador de pasos ────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <div
          className="flex items-center gap-1.5 transition-all duration-300"
          style={{ opacity: showing === "antes" ? 1 : 0.35 }}
        >
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-muted-foreground">Antes</span>
        </div>

        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-primary/50"
              animate={
                isAnimating
                  ? { scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }
                  : { scale: 1, opacity: 0.4 }
              }
              transition={{ duration: 0.6, delay: i * 0.12, repeat: isAnimating ? Infinity : 0 }}
            />
          ))}
        </div>

        <Sparkles className="w-3.5 h-3.5 text-primary/50" />

        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-primary/50"
              animate={
                isAnimating
                  ? { scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }
                  : { scale: 1, opacity: 0.4 }
              }
              transition={{ duration: 0.6, delay: (i + 3) * 0.12, repeat: isAnimating ? Infinity : 0 }}
            />
          ))}
        </div>

        <div
          className="flex items-center gap-1.5 transition-all duration-300"
          style={{ opacity: showing === "despues" ? 1 : 0.35 }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-muted-foreground">Después</span>
        </div>
      </div>
    </div>
  );
}
