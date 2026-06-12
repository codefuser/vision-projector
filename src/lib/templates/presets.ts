/**
 * Theme Preset Library — 50+ built-in themes spanning every common service
 * context, plus animated backgrounds (particles, bokeh, light rays, sparkles,
 * gradient shift, floating cross, soft glow). Each preset bundles a full
 * visual style: background (solid / gradient / animation), per-group text
 * styling (Reference / Tamil / English) and an optional logo placement.
 *
 * Apply via `applyTemplate(id)` — patches every text group + background +
 * logo in one shot so a single click transforms the entire projector.
 */
import type { BackgroundConfig, SectionStyle } from "@/lib/broadcast";
import type { LogoSettings } from "@/stores/logo.store";

export type TemplateCategory =
  | "Classic Worship" | "Modern Worship" | "Prayer Meeting" | "Youth Meeting"
  | "Sunday Service" | "Revival Meeting" | "Conference" | "Christmas"
  | "Easter" | "Good Friday" | "Scripture Focus" | "Minimal" | "Gold"
  | "Blue" | "Fire" | "Heaven" | "Cross" | "Nature" | "Animated";

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  text: Partial<SectionStyle>;
  perGroup?: Partial<Record<"reference" | "tamil" | "english", Partial<SectionStyle>>>;
  background: Partial<BackgroundConfig>;
  logo?: { enabled: boolean; settings?: Partial<LogoSettings> };
}

const shadowSoft = { shadow: true, shadowColor: "#000000", shadowBlur: 22 };
const shadowDeep = { shadow: true, shadowColor: "#000000", shadowBlur: 36 };
const tamilLarge = { fontSizeVw: 5.4 };

const T = (text: Partial<SectionStyle>): Partial<SectionStyle> => ({
  align: "center", vAlign: "middle", lineHeight: 1.3, ...shadowSoft, ...text,
});

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // Classic Worship
  { id: "classic-navy", name: "Classic Navy", category: "Classic Worship",
    description: "White serif on deep navy. Timeless church look.",
    text: T({ fontFamily: "Georgia", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Latha", ...tamilLarge } },
    background: { kind: "color", color: "#0b1d3a" } },
  { id: "classic-burgundy", name: "Classic Burgundy", category: "Classic Worship",
    description: "Ivory text on deep burgundy. Traditional and warm.",
    text: T({ fontFamily: "Georgia", color: "#fdf6e3" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#4a0e1a" } },
  { id: "classic-emerald", name: "Classic Emerald", category: "Classic Worship",
    description: "Gold-tinted serif on rich emerald.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fef3c7" } },
    background: { kind: "color", color: "#064e3b" } },

  // Modern Worship
  { id: "modern-slate", name: "Modern Slate", category: "Modern Worship",
    description: "Crisp sans on charcoal slate. Clean and contemporary.",
    text: T({ fontFamily: "Inter", color: "#f8fafc", fontWeight: 500 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar", ...tamilLarge } },
    background: { kind: "color", color: "#0f172a" } },
  { id: "modern-indigo-gradient", name: "Modern Indigo", category: "Modern Worship",
    description: "Indigo→violet gradient. Sleek modern worship.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 500 }),
    perGroup: { tamil: { fontFamily: "Catamaran", ...tamilLarge } },
    background: { kind: "color", color: "#1e1b4b", gradient: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 50%,#7c3aed 100%)" } },
  { id: "modern-aqua-glow", name: "Modern Aqua Glow", category: "Modern Worship",
    description: "Teal gradient with soft pulsing glow.",
    text: T({ fontFamily: "Inter", color: "#ecfeff", fontWeight: 600 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#0f3a44", gradient: "radial-gradient(circle at 50% 40%,#0e7490 0%,#082f49 80%)", animation: "soft-glow" } },

  // Prayer Meeting
  { id: "prayer-warm-amber", name: "Prayer · Warm Amber", category: "Prayer Meeting",
    description: "Amber serif on near-black. Quiet and reverent.",
    text: T({ fontFamily: "Georgia", color: "#fde68a", ...shadowDeep }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fde68a" } },
    background: { kind: "color", color: "#1c1917" } },
  { id: "prayer-candlelight", name: "Prayer · Candlelight", category: "Prayer Meeting",
    description: "Warm bokeh over dark amber. Reflective evening worship.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7", ...shadowDeep }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fef3c7" } },
    background: { kind: "color", color: "#1a0f08", gradient: "radial-gradient(circle at 50% 70%,#3a1e0a 0%,#0a0604 80%)", animation: "bokeh" } },
  { id: "prayer-twilight", name: "Prayer · Twilight", category: "Prayer Meeting",
    description: "Indigo twilight with floating particles.",
    text: T({ fontFamily: "Georgia", color: "#e0e7ff", ...shadowDeep }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#1e1b4b", gradient: "linear-gradient(180deg,#0f0a2e 0%,#312e81 100%)", animation: "particles" } },

  // Youth Meeting
  { id: "youth-electric-violet", name: "Youth · Electric Violet", category: "Youth Meeting",
    description: "Vibrant violet with energetic bold sans.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 700, letterSpacing: 0.4 }),
    perGroup: { tamil: { fontFamily: "Catamaran", fontWeight: 700, ...tamilLarge } },
    background: { kind: "color", color: "#3b0764", gradient: "linear-gradient(135deg,#3b0764 0%,#7e22ce 50%,#ec4899 100%)" } },
  { id: "youth-neon-mint", name: "Youth · Neon Mint", category: "Youth Meeting",
    description: "Dark base with mint accents and sparkles.",
    text: T({ fontFamily: "Inter", color: "#a7f3d0", fontWeight: 700 }),
    perGroup: { tamil: { fontFamily: "Catamaran", color: "#a7f3d0", fontWeight: 700 } },
    background: { kind: "color", color: "#022c22", gradient: "linear-gradient(135deg,#022c22 0%,#064e3b 100%)", animation: "sparkles" } },
  { id: "youth-sunset-blaze", name: "Youth · Sunset Blaze", category: "Youth Meeting",
    description: "Orange→magenta gradient. Fired-up energy.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 700 }),
    perGroup: { tamil: { fontFamily: "Catamaran", fontWeight: 700 } },
    background: { kind: "color", color: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#db2777 100%)" } },

  // Sunday Service
  { id: "sunday-bright-sky", name: "Sunday · Bright Sky", category: "Sunday Service",
    description: "Calm sky-blue gradient. Morning service feel.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 500 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#0c4a6e", gradient: "linear-gradient(180deg,#0c4a6e 0%,#0369a1 50%,#0284c7 100%)" } },
  { id: "sunday-warm-gold", name: "Sunday · Warm Gold", category: "Sunday Service",
    description: "Soft warm gold gradient with subtle bokeh.",
    text: T({ fontFamily: "Georgia", color: "#fffbeb" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#78350f", gradient: "linear-gradient(135deg,#451a03 0%,#92400e 50%,#b45309 100%)", animation: "bokeh" } },

  // Revival Meeting
  { id: "revival-fire", name: "Revival · Fire", category: "Revival Meeting",
    description: "Deep red with rising sparks. Holy Spirit fire.",
    text: T({ fontFamily: "Inter", color: "#fff7ed", fontWeight: 700 }),
    perGroup: { tamil: { fontFamily: "Catamaran", fontWeight: 700 } },
    background: { kind: "color", color: "#450a0a", gradient: "radial-gradient(circle at 50% 100%,#dc2626 0%,#7f1d1d 40%,#1c0606 90%)", animation: "particles" } },
  { id: "revival-glory", name: "Revival · Glory", category: "Revival Meeting",
    description: "Golden glory with rotating light rays.",
    text: T({ fontFamily: "Georgia", color: "#fffbeb", fontWeight: 600 }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#78350f", gradient: "radial-gradient(circle at 50% 50%,#d97706 0%,#78350f 60%,#1c1006 100%)", animation: "light-rays" } },

  // Conference
  { id: "conference-navy-pro", name: "Conference · Navy Pro", category: "Conference",
    description: "Wide sans, navy backdrop, left-aligned with logo.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 600, align: "left", paddingVw: 8 }),
    perGroup: { tamil: { fontFamily: "Catamaran", fontSizeVw: 5 } },
    background: { kind: "color", color: "#0c1c33" },
    logo: { enabled: true, settings: { position: "top-right", widthPct: 8 } } },
  { id: "conference-graphite", name: "Conference · Graphite", category: "Conference",
    description: "Graphite gradient with thin elegant type.",
    text: T({ fontFamily: "Inter", color: "#f1f5f9", fontWeight: 400 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#1f2937", gradient: "linear-gradient(135deg,#0f172a 0%,#1f2937 100%)" } },

  // Christmas
  { id: "christmas-evergreen", name: "Christmas · Evergreen", category: "Christmas",
    description: "Deep evergreen with warm gold. Festive serif.",
    text: T({ fontFamily: "Georgia", color: "#fbbf24", outlineWidth: 1, outlineColor: "#7f1d1d" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fbbf24" } },
    background: { kind: "color", color: "#064e3b" } },
  { id: "christmas-snow", name: "Christmas · Snowfall", category: "Christmas",
    description: "Frozen-night blue with drifting particles.",
    text: T({ fontFamily: "Georgia", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#0c2340", gradient: "linear-gradient(180deg,#0c2340 0%,#1e3a8a 100%)", animation: "particles" } },
  { id: "christmas-starry", name: "Christmas · Starry Night", category: "Christmas",
    description: "Midnight blue with twinkling stars.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fef3c7" } },
    background: { kind: "color", color: "#0a0e2c", animation: "sparkles" } },

  // Easter
  { id: "easter-lavender", name: "Easter · Lavender", category: "Easter",
    description: "Soft lavender with serif white text.",
    text: T({ fontFamily: "Georgia", color: "#ffffff", shadowColor: "#3b0764", shadowBlur: 24 }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#4c1d95", gradient: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)" } },
  { id: "easter-dawn", name: "Easter · Dawn", category: "Easter",
    description: "Resurrection dawn — pink→gold with light rays.",
    text: T({ fontFamily: "Georgia", color: "#fff7ed", fontWeight: 600 }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#7c2d12", gradient: "linear-gradient(180deg,#7c2d12 0%,#fb923c 60%,#fde68a 100%)", animation: "light-rays" } },

  // Good Friday
  { id: "goodfriday-solemn", name: "Good Friday · Solemn", category: "Good Friday",
    description: "Pure black with soft white serif and floating cross.",
    text: T({ fontFamily: "Georgia", color: "#e5e7eb", ...shadowDeep }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#e5e7eb" } },
    background: { kind: "color", color: "#000000", animation: "floating-cross" } },
  { id: "goodfriday-crimson", name: "Good Friday · Crimson", category: "Good Friday",
    description: "Crimson shadow on black. Weight of the cross.",
    text: T({ fontFamily: "Georgia", color: "#fecaca", ...shadowDeep }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fecaca" } },
    background: { kind: "color", color: "0a0000", gradient: "radial-gradient(circle at 50% 50%,#450a0a 0%,#0a0000 75%)", animation: "floating-cross" } },

  // Scripture Focus
  { id: "scripture-pure", name: "Scripture · Pure Focus", category: "Scripture Focus",
    description: "Black background, large white body, gold reference.",
    text: T({ fontFamily: "Georgia", color: "#ffffff" }),
    perGroup: {
      reference: { color: "#fcd34d", fontSizeVw: 2.6, vAlign: "top" },
      tamil: { fontFamily: "Latha", fontSizeVw: 5.6 },
    },
    background: { kind: "color", color: "#000000" } },
  { id: "scripture-parchment", name: "Scripture · Parchment", category: "Scripture Focus",
    description: "Warm cream with dark ink. Bible-page feel.",
    text: T({ fontFamily: "Georgia", color: "#1c1917", shadow: false, shadowBlur: 0 }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#1c1917" } },
    background: { kind: "color", color: "#fdf6e3" } },
  { id: "scripture-spotlight", name: "Scripture · Spotlight", category: "Scripture Focus",
    description: "Centered soft spotlight on near-black.",
    text: T({ fontFamily: "Georgia", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Latha" } },
    background: { kind: "color", color: "#000000", gradient: "radial-gradient(ellipse at 50% 50%,#1f2937 0%,#000000 80%)" } },

  // Minimal
  { id: "minimal-dark", name: "Minimal Dark", category: "Minimal",
    description: "Pure black, thin white sans, no shadow.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 300, shadow: false, shadowBlur: 0, outlineWidth: 0 }),
    perGroup: { tamil: { fontFamily: "Noto Sans Tamil" } },
    background: { kind: "color", color: "#000000" } },
  { id: "minimal-light", name: "Minimal Light", category: "Minimal",
    description: "Warm off-white, dark ink, zero shadow.",
    text: T({ fontFamily: "Inter", color: "#1f2937", fontWeight: 400, shadow: false, shadowBlur: 0, outlineWidth: 0 }),
    perGroup: { tamil: { fontFamily: "Noto Sans Tamil", color: "#1f2937" } },
    background: { kind: "color", color: "#fdf6e3" } },
  { id: "minimal-charcoal", name: "Minimal Charcoal", category: "Minimal",
    description: "Warm charcoal with soft off-white. Editorial calm.",
    text: T({ fontFamily: "Inter", color: "#f5f5f4", fontWeight: 400, shadow: false }),
    perGroup: { tamil: { fontFamily: "Noto Sans Tamil" } },
    background: { kind: "color", color: "#1c1917" } },

  // Gold
  { id: "gold-royal", name: "Gold · Royal", category: "Gold",
    description: "Rich gold on black. Regal and authoritative.",
    text: T({ fontFamily: "Georgia", color: "#fbbf24", fontWeight: 600, outlineWidth: 1, outlineColor: "#000000" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fbbf24" } },
    background: { kind: "color", color: "#000000" } },
  { id: "gold-velvet", name: "Gold · Velvet", category: "Gold",
    description: "Deep burgundy with gold serif.",
    text: T({ fontFamily: "Georgia", color: "#fde68a" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fde68a" } },
    background: { kind: "color", color: "#3f0610", gradient: "linear-gradient(135deg,#3f0610 0%,#7f1d1d 100%)" } },
  { id: "gold-shimmer", name: "Gold · Shimmer", category: "Gold",
    description: "Gold gradient with twinkling sparkles.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7", fontWeight: 600 }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#78350f", gradient: "linear-gradient(135deg,#451a03 0%,#a16207 50%,#fbbf24 100%)", animation: "sparkles" } },

  // Blue
  { id: "blue-ocean", name: "Blue · Ocean", category: "Blue",
    description: "Deep ocean blue gradient.",
    text: T({ fontFamily: "Inter", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#0c2340", gradient: "linear-gradient(180deg,#0c2340 0%,#1a4a6e 100%)" } },
  { id: "blue-arctic", name: "Blue · Arctic", category: "Blue",
    description: "Icy gradient with crisp serif.",
    text: T({ fontFamily: "Georgia", color: "#e0f2fe" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#e0f2fe" } },
    background: { kind: "color", color: "#082f49", gradient: "linear-gradient(135deg,#082f49 0%,#0c4a6e 50%,#075985 100%)" } },
  { id: "blue-midnight", name: "Blue · Midnight", category: "Blue",
    description: "Near-black blue with drifting particles.",
    text: T({ fontFamily: "Inter", color: "#dbeafe", fontWeight: 500 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#0a0e2c", animation: "particles" } },

  // Fire
  { id: "fire-ember", name: "Fire · Ember", category: "Fire",
    description: "Ember red with rising sparks.",
    text: T({ fontFamily: "Inter", color: "#fff7ed", fontWeight: 700 }),
    perGroup: { tamil: { fontFamily: "Catamaran", fontWeight: 700 } },
    background: { kind: "color", color: "#450a0a", gradient: "radial-gradient(circle at 50% 100%,#dc2626 0%,#450a0a 70%)", animation: "particles" } },
  { id: "fire-coal", name: "Fire · Coal", category: "Fire",
    description: "Glowing coal underlay.",
    text: T({ fontFamily: "Inter", color: "#fed7aa", fontWeight: 600 }),
    perGroup: { tamil: { fontFamily: "Catamaran" } },
    background: { kind: "color", color: "#1c0606", gradient: "radial-gradient(ellipse at 50% 90%,#7f1d1d 0%,#1c0606 80%)", animation: "soft-glow" } },

  // Heaven
  { id: "heaven-light", name: "Heaven · Light", category: "Heaven",
    description: "Sky white with rotating rays of glory.",
    text: T({ fontFamily: "Georgia", color: "#0c4a6e", shadow: false }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#0c4a6e" } },
    background: { kind: "color", color: "#e0f2fe", gradient: "radial-gradient(circle at 50% 30%,#ffffff 0%,#e0f2fe 70%)", animation: "light-rays" } },
  { id: "heaven-cloud", name: "Heaven · Cloud", category: "Heaven",
    description: "Sky-blue with soft floating glow.",
    text: T({ fontFamily: "Georgia", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#7dd3fc", gradient: "linear-gradient(180deg,#bae6fd 0%,#38bdf8 100%)", animation: "soft-glow" } },

  // Cross
  { id: "cross-shadow", name: "Cross · Shadow", category: "Cross",
    description: "Dark backdrop with drifting cross silhouettes.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fef3c7" } },
    background: { kind: "color", color: "#0a0a0a", animation: "floating-cross" } },
  { id: "cross-redemption", name: "Cross · Redemption", category: "Cross",
    description: "Crimson-to-black with cross overlay.",
    text: T({ fontFamily: "Georgia", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#1c0606", gradient: "linear-gradient(180deg,#450a0a 0%,#0a0000 100%)", animation: "floating-cross" } },

  // Nature
  { id: "nature-forest", name: "Nature · Forest", category: "Nature",
    description: "Deep forest green gradient.",
    text: T({ fontFamily: "Georgia", color: "#ecfccb" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#ecfccb" } },
    background: { kind: "color", color: "#14532d", gradient: "linear-gradient(180deg,#14532d 0%,#166534 100%)" } },
  { id: "nature-mountain", name: "Nature · Mountain", category: "Nature",
    description: "Cool stone-blue gradient.",
    text: T({ fontFamily: "Inter", color: "#f8fafc" }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#1e293b", gradient: "linear-gradient(180deg,#0f172a 0%,#475569 100%)" } },
  { id: "nature-autumn", name: "Nature · Autumn", category: "Nature",
    description: "Warm autumn rust and amber.",
    text: T({ fontFamily: "Georgia", color: "#fffbeb" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12 0%,#c2410c 100%)" } },

  // Animated showcase
  { id: "animated-worship-flow", name: "Animated · Worship Flow", category: "Animated",
    description: "Indigo gradient that gently shifts. Worship motion graphic.",
    text: T({ fontFamily: "Inter", color: "#ffffff", fontWeight: 500 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar", ...tamilLarge } },
    background: { kind: "color", color: "#1e1b4b", animation: "gradient-shift" } },
  { id: "animated-bokeh-warm", name: "Animated · Warm Bokeh", category: "Animated",
    description: "Warm soft bokeh circles over deep amber.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fef3c7" } },
    background: { kind: "color", color: "#1a0f08", animation: "bokeh" } },
  { id: "animated-particles-dark", name: "Animated · Particles", category: "Animated",
    description: "Soft white particles rising on near-black.",
    text: T({ fontFamily: "Inter", color: "#ffffff" }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#0a0a0a", animation: "particles" } },
  { id: "animated-sparkle-night", name: "Animated · Sparkle Night", category: "Animated",
    description: "Twinkling stars on midnight indigo.",
    text: T({ fontFamily: "Georgia", color: "#fef3c7" }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil", color: "#fef3c7" } },
    background: { kind: "color", color: "#0a0e2c", animation: "sparkles" } },
  { id: "animated-rays-glory", name: "Animated · Rays of Glory", category: "Animated",
    description: "Rotating golden light rays over gold radial.",
    text: T({ fontFamily: "Georgia", color: "#fffbeb", fontWeight: 600 }),
    perGroup: { tamil: { fontFamily: "Noto Serif Tamil" } },
    background: { kind: "color", color: "#78350f", gradient: "radial-gradient(circle at 50% 50%,#a16207 0%,#1c1006 80%)", animation: "light-rays" } },
  { id: "animated-soft-pulse", name: "Animated · Soft Pulse", category: "Animated",
    description: "Centered halo gently pulsing on slate.",
    text: T({ fontFamily: "Inter", color: "#f8fafc", fontWeight: 500 }),
    perGroup: { tamil: { fontFamily: "Mukta Malar" } },
    background: { kind: "color", color: "#0f172a", animation: "soft-glow" } },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Classic Worship", "Modern Worship", "Prayer Meeting", "Youth Meeting",
  "Sunday Service", "Revival Meeting", "Conference", "Christmas", "Easter",
  "Good Friday", "Scripture Focus", "Minimal", "Gold", "Blue", "Fire",
  "Heaven", "Cross", "Nature", "Animated",
];
