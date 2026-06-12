/**
 * Built-in presentation templates. Each template defines a complete look —
 * background, text colors, fonts, alignment, shadow/outline, positioning
 * and logo placement — that can be applied with one click. Applied via
 * `applyTemplate(id)` which patches every text group + background + logo.
 */
import type { BackgroundConfig, SectionStyle } from "@/lib/broadcast";
import type { LogoSettings } from "@/stores/logo.store";

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  /** Subset of fields to apply to ALL text groups (reference / tamil / english). */
  text: Partial<SectionStyle>;
  /** Optional per-group overrides (e.g. larger Tamil font). */
  perGroup?: Partial<Record<"reference" | "tamil" | "english", Partial<SectionStyle>>>;
  background: Partial<BackgroundConfig>;
  logo?: { enabled: boolean; settings?: Partial<LogoSettings> };
}

const baseShadow = { shadow: true, shadowColor: "#000000", shadowBlur: 28 };

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "classic-worship",
    name: "Classic Worship",
    description: "White on deep blue, serif headings, soft shadow.",
    text: { fontFamily: "Georgia", color: "#ffffff", align: "center", vAlign: "middle", lineHeight: 1.3, letterSpacing: 0, ...baseShadow, outlineWidth: 0 },
    perGroup: { tamil: { fontFamily: "Latha", fontSizeVw: 5.4 } },
    background: { kind: "color", color: "#0b1d3a" },
  },
  {
    id: "modern-worship",
    name: "Modern Worship",
    description: "Clean sans-serif, charcoal background, subtle glow.",
    text: { fontFamily: "Inter", color: "#f8fafc", fontWeight: 500, align: "center", vAlign: "middle", shadow: true, shadowColor: "#000000", shadowBlur: 18, outlineWidth: 0 },
    perGroup: { tamil: { fontFamily: "Mukta Malar", fontSizeVw: 5.2 } },
    background: { kind: "color", color: "#0f172a" },
  },
  {
    id: "youth-meeting",
    name: "Youth Meeting",
    description: "Bold sans, vibrant violet background, energetic.",
    text: { fontFamily: "Inter", color: "#ffffff", fontWeight: 700, align: "center", vAlign: "middle", letterSpacing: 0.4, ...baseShadow },
    perGroup: { tamil: { fontFamily: "Catamaran", fontSizeVw: 5.4, fontWeight: 700 } },
    background: { kind: "color", color: "#3b0764" },
  },
  {
    id: "prayer-meeting",
    name: "Prayer Meeting",
    description: "Warm amber tones on near-black for reflective evenings.",
    text: { fontFamily: "Georgia", color: "#fde68a", align: "center", vAlign: "middle", lineHeight: 1.35, ...baseShadow },
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fde68a" } },
    background: { kind: "color", color: "#1c1917" },
  },
  {
    id: "scripture-focus",
    name: "Scripture Focus",
    description: "High-contrast white-on-black, top reference, large body.",
    text: { fontFamily: "Georgia", color: "#ffffff", align: "center", vAlign: "middle", lineHeight: 1.3, ...baseShadow },
    perGroup: {
      reference: { color: "#fcd34d", fontSizeVw: 2.6, vAlign: "top" },
      tamil: { fontFamily: "Latha", fontSizeVw: 5.6 },
    },
    background: { kind: "color", color: "#000000" },
  },
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    description: "Solid black, thin white text, no shadow.",
    text: { fontFamily: "Inter", color: "#ffffff", fontWeight: 300, align: "center", vAlign: "middle", shadow: false, shadowBlur: 0, outlineWidth: 0 },
    perGroup: { tamil: { fontFamily: "Noto Sans Tamil" } },
    background: { kind: "color", color: "#000000" },
  },
  {
    id: "minimal-light",
    name: "Minimal Light",
    description: "Soft cream background, dark text, no shadow.",
    text: { fontFamily: "Inter", color: "#1f2937", fontWeight: 400, align: "center", vAlign: "middle", shadow: false, shadowBlur: 0, outlineWidth: 0 },
    perGroup: { tamil: { fontFamily: "Noto Sans Tamil", color: "#1f2937" } },
    background: { kind: "color", color: "#fdf6e3" },
  },
  {
    id: "conference-style",
    name: "Conference Style",
    description: "Wide sans, navy background, left-aligned with breathing room.",
    text: { fontFamily: "Inter", color: "#ffffff", fontWeight: 600, align: "left", vAlign: "middle", paddingVw: 8, ...baseShadow },
    perGroup: { tamil: { fontFamily: "Catamaran", fontSizeVw: 5 } },
    background: { kind: "color", color: "#0c1c33" },
    logo: { enabled: true, settings: { position: "top-right", widthPct: 8 } },
  },
  {
    id: "christmas-theme",
    name: "Christmas Theme",
    description: "Deep evergreen, warm gold text, festive.",
    text: { fontFamily: "Georgia", color: "#fbbf24", align: "center", vAlign: "middle", outlineWidth: 1, outlineColor: "#7f1d1d", ...baseShadow },
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fbbf24" } },
    background: { kind: "color", color: "#064e3b" },
  },
  {
    id: "easter-theme",
    name: "Easter Theme",
    description: "Soft lavender background, white serif text, gentle glow.",
    text: { fontFamily: "Georgia", color: "#ffffff", align: "center", vAlign: "middle", shadow: true, shadowColor: "#3b0764", shadowBlur: 24 },
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#4c1d95" },
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Pure black with bright yellow text + outline. Best for daylight.",
    text: { fontFamily: "Inter", color: "#facc15", fontWeight: 700, align: "center", vAlign: "middle", outlineWidth: 3, outlineColor: "#000000", shadow: false, shadowBlur: 0 },
    perGroup: { tamil: { fontFamily: "Catamaran" } },
    background: { kind: "color", color: "#000000" },
  },
  {
    id: "soft-blue",
    name: "Soft Blue",
    description: "Muted sky-blue background, gentle white text.",
    text: { fontFamily: "Inter", color: "#ffffff", fontWeight: 500, align: "center", vAlign: "middle", ...baseShadow },
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#1e3a8a" },
  },
];
