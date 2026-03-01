"use client";

import { useReducedMotion } from "framer-motion";

/* ── Noise SVG data URI ── */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

/* ═══════════════════════════════════════════════════
   BackgroundLayer
   Layers (back → front):
     1. Ambient gradient drift (single coherent animation)
     2. Dot-grid texture (static)
     3. Vignette (dims edges + keeps center clean)
     4. Ultra-subtle grain overlay (static)
   ═══════════════════════════════════════════════════ */

export default function BackgroundLayer() {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
      aria-hidden
    >
      {/* ─── 1. Ambient gradient drift ─── */}
      <div
        className={`absolute inset-0 ${prefersReduced ? "" : "bg-drift-animate"}`}
        style={{
          opacity: 0.07,
          background: [
            "radial-gradient(ellipse 45% 40% at 20% 25%, rgba(120,120,255,0.25), transparent 70%)",
            "radial-gradient(ellipse 40% 35% at 75% 65%, rgba(160,120,255,0.18), transparent 70%)",
            "radial-gradient(ellipse 35% 40% at 50% 85%, rgba(90,180,255,0.15), transparent 70%)",
          ].join(", "),
          backgroundSize: "200% 200%",
          backgroundPosition: "0% 0%",
        }}
      />

      {/* ─── 2. Dot-grid texture ─── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0) 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0",
        }}
      />

      {/* ─── 3. Vignette (dims edges, keeps center readable) ─── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* ─── 4. Grain overlay (static, ultra-low opacity) ─── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: NOISE_SVG,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.04,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
