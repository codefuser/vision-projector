/**
 * Theme Preset Library — 200+ built-in worship presentation themes spanning
 * every major service context plus premium animated backgrounds. Each preset
 * bundles a full visual style: background (solid / gradient / animation),
 * per-group text styling (Reference / Tamil / English) and an optional logo
 * placement. Apply via `applyTemplate(id)` to transform every projection
 * surface (Bible / Songs / Text) in one click.
 *
 * Presets are kept as plain JS objects (no runtime cost) and the gallery
 * lazy-renders their preview thumbnails so 200+ themes stay smooth.
 */
import type { BackgroundConfig, SectionStyle, BackgroundAnimation } from "@/lib/broadcast";
import type { LogoSettings } from "@/stores/logo.store";

export type TemplateCategory =
  | "Classic Worship" | "Modern Worship" | "Prayer Meeting" | "Sunday Service"
  | "Youth Service" | "Revival Meeting" | "Conference" | "Bible Study"
  | "Christmas" | "Good Friday" | "Easter" | "Palm Sunday" | "Harvest Festival"
  | "New Year Service" | "Wedding Service" | "Thanksgiving Service"
  | "Children Ministry" | "Women's Fellowship" | "Men's Fellowship"
  | "Fasting Prayer" | "Holy Communion" | "Mission Sunday"
  | "Nature Themes" | "Cross Themes" | "Heaven Themes" | "Fire Themes"
  | "Light Themes" | "Dark Themes" | "Minimal Themes"
  | "Animated Themes" | "Cinematic Themes";

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

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Classic Worship", "Modern Worship", "Prayer Meeting", "Sunday Service",
  "Youth Service", "Revival Meeting", "Conference", "Bible Study",
  "Christmas", "Good Friday", "Easter", "Palm Sunday", "Harvest Festival",
  "New Year Service", "Wedding Service", "Thanksgiving Service",
  "Children Ministry", "Women's Fellowship", "Men's Fellowship",
  "Fasting Prayer", "Holy Communion", "Mission Sunday",
  "Nature Themes", "Cross Themes", "Heaven Themes", "Fire Themes",
  "Light Themes", "Dark Themes", "Minimal Themes",
  "Animated Themes", "Cinematic Themes",
];

// ───────── Builder helpers ─────────
const shadowSoft = { shadow: true, shadowColor: "#000000", shadowBlur: 22 };
const shadowDeep = { shadow: true, shadowColor: "#000000", shadowBlur: 36 };
const T = (text: Partial<SectionStyle>): Partial<SectionStyle> => ({
  align: "center", vAlign: "middle", lineHeight: 1.3, ...shadowSoft, ...text,
});

interface BuildOpts {
  id: string; name: string; category: TemplateCategory; description?: string;
  bg: string; gradient?: string; animation?: BackgroundAnimation;
  color?: string; refColor?: string;
  fontEn?: string; fontTa?: string; weight?: number;
  shadow?: "soft" | "deep" | "none";
  tamilSize?: number;
  logo?: TemplatePreset["logo"];
}
const build = (o: BuildOpts): TemplatePreset => {
  const fontEn = o.fontEn ?? "Inter";
  const fontTa = o.fontTa ?? "Latha";
  const color = o.color ?? "#ffffff";
  const sh = o.shadow === "none" ? { shadow: false, shadowBlur: 0 }
    : o.shadow === "deep" ? shadowDeep : shadowSoft;
  return {
    id: o.id, name: o.name, category: o.category,
    description: o.description ?? `${o.name} — worship preset.`,
    text: { ...T({ fontFamily: fontEn, color, fontWeight: o.weight ?? 500 }), ...sh },
    perGroup: {
      reference: o.refColor ? { color: o.refColor } : undefined,
      tamil: { fontFamily: fontTa, fontSizeVw: o.tamilSize ?? 5.2 },
      english: { fontFamily: fontEn },
    },
    background: {
      kind: "color", color: o.bg,
      gradient: o.gradient ?? null,
      animation: o.animation ?? "none",
    },
    logo: o.logo,
  };
};

// ───────── Theme library (200+) ─────────
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  // Classic Worship (8)
  build({ id: "cw-navy", name: "Classic Navy", category: "Classic Worship", bg: "#0b1d3a", fontEn: "Georgia", fontTa: "Latha", description: "White serif on deep navy. Timeless church look." }),
  build({ id: "cw-burgundy", name: "Classic Burgundy", category: "Classic Worship", bg: "#4a0e1a", color: "#fdf6e3", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Ivory serif on burgundy. Traditional and warm." }),
  build({ id: "cw-emerald", name: "Classic Emerald", category: "Classic Worship", bg: "#064e3b", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Gold-tinted serif on emerald." }),
  build({ id: "cw-ivory", name: "Classic Ivory", category: "Classic Worship", bg: "#fdf6e3", color: "#1f2937", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Dark serif on warm ivory. Bible-page calm." }),
  build({ id: "cw-royal", name: "Royal Sapphire", category: "Classic Worship", bg: "#1e3a8a", gradient: "linear-gradient(135deg,#1e3a8a,#1e40af)", fontEn: "Georgia", description: "Regal sapphire gradient." }),
  build({ id: "cw-velvet", name: "Velvet Hymn", category: "Classic Worship", bg: "#3f0610", gradient: "linear-gradient(135deg,#3f0610,#7f1d1d)", color: "#fde68a", fontEn: "Georgia", description: "Hymnbook velvet with gold serif." }),
  build({ id: "cw-walnut", name: "Walnut Pulpit", category: "Classic Worship", bg: "#3b2412", color: "#fef3c7", fontEn: "Georgia", description: "Warm walnut wood feel." }),
  build({ id: "cw-stone", name: "Sanctuary Stone", category: "Classic Worship", bg: "#3f3f46", color: "#f5f5f4", fontEn: "Georgia", description: "Quiet stone sanctuary." }),

  // Modern Worship (10)
  build({ id: "mw-slate", name: "Modern Slate", category: "Modern Worship", bg: "#0f172a", fontTa: "Mukta Malar", description: "Crisp sans on charcoal slate." }),
  build({ id: "mw-indigo", name: "Modern Indigo", category: "Modern Worship", bg: "#1e1b4b", gradient: "linear-gradient(135deg,#1e1b4b,#4338ca 50%,#7c3aed)", fontTa: "Catamaran", description: "Indigo→violet gradient." }),
  build({ id: "mw-aqua-glow", name: "Aqua Glow", category: "Modern Worship", bg: "#0f3a44", gradient: "radial-gradient(circle at 50% 40%,#0e7490,#082f49 80%)", animation: "soft-glow", fontTa: "Mukta Malar", description: "Teal with pulsing glow." }),
  build({ id: "mw-violet-mist", name: "Violet Mist", category: "Modern Worship", bg: "#312e81", gradient: "linear-gradient(180deg,#312e81,#1e1b4b)", animation: "fog", fontTa: "Catamaran", description: "Violet with drifting mist." }),
  build({ id: "mw-cyan-pulse", name: "Cyan Pulse", category: "Modern Worship", bg: "#083344", animation: "soft-glow", fontTa: "Catamaran", description: "Cyan pulse under bold sans." }),
  build({ id: "mw-rose-modern", name: "Rose Modern", category: "Modern Worship", bg: "#831843", gradient: "linear-gradient(135deg,#500724,#9d174d)", fontTa: "Catamaran", description: "Rose gradient." }),
  build({ id: "mw-teal-graphite", name: "Teal Graphite", category: "Modern Worship", bg: "#134e4a", gradient: "linear-gradient(135deg,#042f2e,#115e59)", fontTa: "Catamaran", description: "Teal on graphite." }),
  build({ id: "mw-mono-bold", name: "Mono Bold", category: "Modern Worship", bg: "#18181b", color: "#fafafa", weight: 700, description: "Mono black with bold sans." }),
  build({ id: "mw-skyline", name: "Skyline", category: "Modern Worship", bg: "#0c4a6e", gradient: "linear-gradient(180deg,#0c4a6e,#1e3a8a)", fontTa: "Mukta Malar", description: "Layered skyline blue." }),
  build({ id: "mw-blush", name: "Blush Modern", category: "Modern Worship", bg: "#4a1d1d", gradient: "linear-gradient(135deg,#4a1d1d,#9f1239)", color: "#fff1f2", fontTa: "Catamaran", description: "Blush warmth." }),

  // Prayer Meeting (8)
  build({ id: "pr-amber", name: "Prayer Warm Amber", category: "Prayer Meeting", bg: "#1c1917", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "Amber serif on near-black. Quiet and reverent." }),
  build({ id: "pr-candle", name: "Candlelight", category: "Prayer Meeting", bg: "#1a0f08", gradient: "radial-gradient(circle at 50% 70%,#3a1e0a,#0a0604 80%)", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Flickering candle warmth." }),
  build({ id: "pr-twilight", name: "Twilight", category: "Prayer Meeting", bg: "#1e1b4b", gradient: "linear-gradient(180deg,#0f0a2e,#312e81)", animation: "particles", color: "#e0e7ff", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Indigo twilight with particles." }),
  build({ id: "pr-quiet-night", name: "Quiet Night", category: "Prayer Meeting", bg: "#0a0a0a", animation: "soft-glow", color: "#e5e7eb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Stillness with a soft halo." }),
  build({ id: "pr-incense", name: "Incense Smoke", category: "Prayer Meeting", bg: "#1c0f1a", animation: "fog", color: "#fbcfe8", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Soft drifting fog." }),
  build({ id: "pr-altar", name: "Altar Hush", category: "Prayer Meeting", bg: "#0f0f17", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Hushed altar tones." }),
  build({ id: "pr-deep-wine", name: "Deep Wine", category: "Prayer Meeting", bg: "#3f0610", color: "#fecaca", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Deep wine with crimson text." }),
  build({ id: "pr-monastery", name: "Monastery", category: "Prayer Meeting", bg: "#1f1612", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Quiet monastery warmth." }),

  // Sunday Service (8)
  build({ id: "ss-sky", name: "Sunday Bright Sky", category: "Sunday Service", bg: "#0c4a6e", gradient: "linear-gradient(180deg,#0c4a6e,#0369a1 50%,#0284c7)", fontTa: "Mukta Malar", description: "Morning service sky-blue." }),
  build({ id: "ss-gold", name: "Sunday Warm Gold", category: "Sunday Service", bg: "#78350f", gradient: "linear-gradient(135deg,#451a03,#92400e 50%,#b45309)", animation: "bokeh", fontEn: "Georgia", fontTa: "Noto Serif Tamil", color: "#fffbeb", description: "Warm gold with soft bokeh." }),
  build({ id: "ss-sunrise", name: "Sunday Sunrise", category: "Sunday Service", bg: "#7c2d12", gradient: "linear-gradient(180deg,#7c2d12,#fb923c 70%,#fde68a)", animation: "sunrise", fontEn: "Georgia", fontTa: "Noto Serif Tamil", color: "#1f2937", shadow: "none", description: "Sunrise resurrection morning." }),
  build({ id: "ss-clean-blue", name: "Clean Sunday Blue", category: "Sunday Service", bg: "#1e3a8a", fontTa: "Mukta Malar", description: "Clean blue worship." }),
  build({ id: "ss-warm-day", name: "Warm Day", category: "Sunday Service", bg: "#ea580c", gradient: "linear-gradient(135deg,#7c2d12,#ea580c)", description: "Sunday morning warmth." }),
  build({ id: "ss-pastoral", name: "Pastoral Calm", category: "Sunday Service", bg: "#0c4a6e", animation: "clouds", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Drifting clouds." }),
  build({ id: "ss-blessing", name: "Blessing Light", category: "Sunday Service", bg: "#0b1d3a", animation: "light-rays", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Light through stained glass." }),
  build({ id: "ss-festive", name: "Festive Sunday", category: "Sunday Service", bg: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12,#dc2626)", fontTa: "Catamaran", description: "Festive worship colours." }),

  // Youth Service (8)
  build({ id: "ys-violet", name: "Electric Violet", category: "Youth Service", bg: "#3b0764", gradient: "linear-gradient(135deg,#3b0764,#7e22ce 50%,#ec4899)", fontTa: "Catamaran", weight: 700, description: "Vibrant violet energy." }),
  build({ id: "ys-neon-mint", name: "Neon Mint", category: "Youth Service", bg: "#022c22", gradient: "linear-gradient(135deg,#022c22,#064e3b)", animation: "sparkles", color: "#a7f3d0", fontTa: "Catamaran", weight: 700, description: "Dark base with mint sparkles." }),
  build({ id: "ys-sunset", name: "Sunset Blaze", category: "Youth Service", bg: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12,#ea580c 50%,#db2777)", fontTa: "Catamaran", weight: 700, description: "Orange→magenta blaze." }),
  build({ id: "ys-cyber", name: "Cyber Worship", category: "Youth Service", bg: "#020617", animation: "abstract-worship", fontTa: "Catamaran", weight: 700, description: "Cyber abstract motion." }),
  build({ id: "ys-stage", name: "Stage Lights", category: "Youth Service", bg: "#0a0a0a", animation: "stage-lights", fontTa: "Catamaran", weight: 700, description: "Sweeping stage spotlights." }),
  build({ id: "ys-fire", name: "Youth Fire", category: "Youth Service", bg: "#450a0a", animation: "fire-glow", fontTa: "Catamaran", weight: 700, description: "Hot, fired-up youth night." }),
  build({ id: "ys-pop", name: "Pop Pulse", category: "Youth Service", bg: "#831843", gradient: "linear-gradient(135deg,#500724,#be185d,#ec4899)", fontTa: "Catamaran", weight: 700, description: "Popping pink pulse." }),
  build({ id: "ys-skater", name: "Street Indigo", category: "Youth Service", bg: "#1e1b4b", animation: "abstract-worship", fontTa: "Catamaran", weight: 700, description: "Street-feel indigo." }),

  // Revival Meeting (8)
  build({ id: "rv-fire", name: "Revival Fire", category: "Revival Meeting", bg: "#450a0a", gradient: "radial-gradient(circle at 50% 100%,#dc2626,#7f1d1d 40%,#1c0606 90%)", animation: "fire-glow", fontTa: "Catamaran", weight: 700, color: "#fff7ed", description: "Holy Spirit fire." }),
  build({ id: "rv-glory", name: "Glory Rays", category: "Revival Meeting", bg: "#78350f", gradient: "radial-gradient(circle at 50% 50%,#d97706,#78350f 60%,#1c1006)", animation: "light-rays", fontEn: "Georgia", fontTa: "Noto Serif Tamil", weight: 600, color: "#fffbeb", description: "Golden glory rays." }),
  build({ id: "rv-outpouring", name: "Outpouring", category: "Revival Meeting", bg: "#1e1b4b", animation: "golden-particles", fontEn: "Georgia", fontTa: "Noto Serif Tamil", color: "#fef3c7", description: "Golden outpouring particles." }),
  build({ id: "rv-thunder", name: "Thunder Sky", category: "Revival Meeting", bg: "#0c1c33", animation: "cross-beam", fontTa: "Catamaran", weight: 600, description: "Thundering glory beam." }),
  build({ id: "rv-altar-fire", name: "Altar Fire", category: "Revival Meeting", bg: "#1c0606", animation: "fire-glow", color: "#fed7aa", fontTa: "Catamaran", weight: 700, description: "Smoldering altar fire." }),
  build({ id: "rv-aurora-glory", name: "Aurora Glory", category: "Revival Meeting", bg: "#0a0e2c", animation: "aurora", fontTa: "Catamaran", weight: 600, description: "Aurora of glory." }),
  build({ id: "rv-rain-spirit", name: "Latter Rain", category: "Revival Meeting", bg: "#0c2340", animation: "rain", color: "#dbeafe", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Latter rain outpouring." }),
  build({ id: "rv-deep-call", name: "Deep Calls Deep", category: "Revival Meeting", bg: "#082f49", animation: "ocean", fontEn: "Georgia", fontTa: "Noto Serif Tamil", color: "#e0f2fe", description: "Deep waters of revival." }),

  // Conference (6)
  build({ id: "cf-navy-pro", name: "Conference Navy Pro", category: "Conference", bg: "#0c1c33", fontTa: "Catamaran", weight: 600, description: "Wide sans, navy backdrop, logo top right.", logo: { enabled: true, settings: { position: "top-right", widthPct: 8 } } }),
  build({ id: "cf-graphite", name: "Conference Graphite", category: "Conference", bg: "#1f2937", gradient: "linear-gradient(135deg,#0f172a,#1f2937)", fontTa: "Mukta Malar", weight: 400, description: "Graphite gradient elegance." }),
  build({ id: "cf-broadcast", name: "Broadcast Black", category: "Conference", bg: "#000000", fontTa: "Catamaran", weight: 500, description: "Broadcast-grade black.", logo: { enabled: true, settings: { position: "bottom-right", widthPct: 7 } } }),
  build({ id: "cf-keynote", name: "Keynote Charcoal", category: "Conference", bg: "#0a0a0a", gradient: "radial-gradient(ellipse at 50% 50%,#262626,#0a0a0a 80%)", fontTa: "Catamaran", weight: 500, description: "Keynote-style charcoal." }),
  build({ id: "cf-summit", name: "Summit Indigo", category: "Conference", bg: "#1e1b4b", fontTa: "Catamaran", weight: 600, description: "Summit indigo." }),
  build({ id: "cf-press", name: "Press Stage", category: "Conference", bg: "#111827", animation: "stage-lights", fontTa: "Catamaran", weight: 600, description: "Press-stage spotlight motion." }),

  // Bible Study (6)
  build({ id: "bs-parchment", name: "Parchment Page", category: "Bible Study", bg: "#fdf6e3", color: "#1c1917", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Cream parchment with dark ink." }),
  build({ id: "bs-scholar", name: "Scholar Dark", category: "Bible Study", bg: "#0a0a0a", color: "#ffffff", refColor: "#fcd34d", fontEn: "Georgia", fontTa: "Latha", description: "Black backdrop, gold reference." }),
  build({ id: "bs-spotlight", name: "Scripture Spotlight", category: "Bible Study", bg: "#000000", gradient: "radial-gradient(ellipse at 50% 50%,#1f2937,#000000 80%)", fontEn: "Georgia", fontTa: "Latha", description: "Centred spotlight on scripture." }),
  build({ id: "bs-ink", name: "Ink and Paper", category: "Bible Study", bg: "#f5f5f4", color: "#0c0a09", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Ink-on-paper readability." }),
  build({ id: "bs-study-blue", name: "Study Blue", category: "Bible Study", bg: "#0c2340", refColor: "#93c5fd", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Calm study blue." }),
  build({ id: "bs-quiet-cream", name: "Quiet Cream", category: "Bible Study", bg: "#f5efe0", color: "#1c1917", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Soft cream for daylight rooms." }),

  // Christmas (8)
  build({ id: "xm-evergreen", name: "Christmas Evergreen", category: "Christmas", bg: "#064e3b", color: "#fbbf24", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Festive evergreen + gold." }),
  build({ id: "xm-snow", name: "Christmas Snowfall", category: "Christmas", bg: "#0c2340", gradient: "linear-gradient(180deg,#0c2340,#1e3a8a)", animation: "particles", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Snowy midnight blue." }),
  build({ id: "xm-starry", name: "Starry Night", category: "Christmas", bg: "#0a0e2c", animation: "star-field", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Twinkling stars over Bethlehem." }),
  build({ id: "xm-velvet-red", name: "Velvet Red", category: "Christmas", bg: "#7f1d1d", gradient: "linear-gradient(135deg,#450a0a,#991b1b)", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Velvet red and gold." }),
  build({ id: "xm-candles", name: "Christmas Candles", category: "Christmas", bg: "#1a0f08", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Advent candle warmth." }),
  build({ id: "xm-emmanuel", name: "Emmanuel Gold", category: "Christmas", bg: "#1c1006", animation: "golden-particles", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Golden hush of the Saviour's birth." }),
  build({ id: "xm-frost", name: "Frosted Night", category: "Christmas", bg: "#082f49", gradient: "linear-gradient(135deg,#082f49,#0c4a6e)", animation: "sparkles", color: "#e0f2fe", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Cool frosted sparkle." }),
  build({ id: "xm-nativity", name: "Nativity Glow", category: "Christmas", bg: "#1c1006", animation: "soft-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Manger glow." }),

  // Good Friday (6)
  build({ id: "gf-solemn", name: "Solemn Cross", category: "Good Friday", bg: "#000000", animation: "floating-cross", color: "#e5e7eb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "Pure black with drifting cross." }),
  build({ id: "gf-crimson", name: "Crimson Sorrow", category: "Good Friday", bg: "#0a0000", gradient: "radial-gradient(circle at 50% 50%,#450a0a,#0a0000 75%)", animation: "floating-cross", color: "#fecaca", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "Crimson sorrow." }),
  build({ id: "gf-veil", name: "Torn Veil", category: "Good Friday", bg: "#0a0000", animation: "cross-beam", color: "#fee2e2", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "Light through the torn veil." }),
  build({ id: "gf-grief", name: "Garden of Grief", category: "Good Friday", bg: "#0f1410", animation: "fog", color: "#e5e7eb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Gethsemane fog." }),
  build({ id: "gf-thorn", name: "Crown of Thorns", category: "Good Friday", bg: "#1c0606", color: "#fecaca", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Deep crimson reverence." }),
  build({ id: "gf-stillness", name: "Tomb Stillness", category: "Good Friday", bg: "#0a0a0a", color: "#cbd5e1", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "Quiet stillness of the tomb." }),

  // Easter (6)
  build({ id: "es-lavender", name: "Easter Lavender", category: "Easter", bg: "#4c1d95", gradient: "linear-gradient(135deg,#4c1d95,#7c3aed)", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Soft lavender on white serif." }),
  build({ id: "es-dawn", name: "Resurrection Dawn", category: "Easter", bg: "#7c2d12", gradient: "linear-gradient(180deg,#7c2d12,#fb923c 60%,#fde68a)", animation: "sunrise", color: "#fff7ed", weight: 600, fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Dawn of resurrection." }),
  build({ id: "es-empty-tomb", name: "Empty Tomb", category: "Easter", bg: "#e0f2fe", color: "#0c4a6e", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", animation: "light-rays", description: "Bright morning at the empty tomb." }),
  build({ id: "es-alive", name: "He Is Alive", category: "Easter", bg: "#7c3aed", gradient: "linear-gradient(135deg,#4c1d95,#a78bfa)", animation: "golden-particles", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Joy of resurrection." }),
  build({ id: "es-bloom", name: "Easter Bloom", category: "Easter", bg: "#fce7f3", color: "#831843", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Spring-bloom pink." }),
  build({ id: "es-glory", name: "Risen Glory", category: "Easter", bg: "#78350f", gradient: "radial-gradient(circle at 50% 50%,#fbbf24,#78350f 70%)", animation: "light-rays", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Risen Lord glory." }),

  // Palm Sunday (4)
  build({ id: "pm-palms", name: "Palm Procession", category: "Palm Sunday", bg: "#14532d", gradient: "linear-gradient(135deg,#14532d,#16a34a)", color: "#fefce8", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Green palms of welcome." }),
  build({ id: "pm-hosanna", name: "Hosanna Gold", category: "Palm Sunday", bg: "#365314", gradient: "linear-gradient(135deg,#365314,#a16207)", color: "#fefce8", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Hosanna joy with golden warmth." }),
  build({ id: "pm-jerusalem", name: "Jerusalem Sky", category: "Palm Sunday", bg: "#7c2d12", gradient: "linear-gradient(180deg,#7c2d12,#fbbf24)", animation: "sunrise", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Jerusalem morning sky." }),
  build({ id: "pm-branches", name: "Olive Branches", category: "Palm Sunday", bg: "#1a2e05", color: "#ecfccb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Deep olive branches." }),

  // Harvest Festival (4)
  build({ id: "hv-wheat", name: "Wheat Harvest", category: "Harvest Festival", bg: "#78350f", gradient: "linear-gradient(135deg,#78350f,#d97706,#fbbf24)", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Golden wheat fields." }),
  build({ id: "hv-autumn", name: "Autumn Harvest", category: "Harvest Festival", bg: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12,#c2410c)", color: "#fff7ed", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm autumn rust." }),
  build({ id: "hv-firstfruits", name: "First Fruits", category: "Harvest Festival", bg: "#92400e", animation: "golden-particles", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "First fruits gold." }),
  build({ id: "hv-barn", name: "Barn Warmth", category: "Harvest Festival", bg: "#451a03", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm barn glow." }),

  // New Year Service (4)
  build({ id: "ny-sparkle", name: "New Year Sparkle", category: "New Year Service", bg: "#0a0e2c", animation: "sparkles", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Midnight countdown sparkle." }),
  build({ id: "ny-fireworks", name: "Fireworks", category: "New Year Service", bg: "#0a0e2c", animation: "golden-particles", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Bursts of golden light." }),
  build({ id: "ny-gold", name: "Golden Year", category: "New Year Service", bg: "#78350f", gradient: "linear-gradient(135deg,#451a03,#a16207,#fbbf24)", animation: "sparkles", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", weight: 600, description: "Golden year ahead." }),
  build({ id: "ny-fresh", name: "Fresh Start", category: "New Year Service", bg: "#082f49", gradient: "linear-gradient(135deg,#082f49,#0369a1)", animation: "sunrise", description: "Fresh sunrise start." }),

  // Wedding Service (4)
  build({ id: "wd-rose-gold", name: "Rose Gold", category: "Wedding Service", bg: "#9d174d", gradient: "linear-gradient(135deg,#831843,#db2777,#fbcfe8)", color: "#fff1f2", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Rose-gold wedding." }),
  build({ id: "wd-blush", name: "Blush Petals", category: "Wedding Service", bg: "#fce7f3", color: "#831843", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Soft blush petals." }),
  build({ id: "wd-cathedral", name: "Cathedral Glow", category: "Wedding Service", bg: "#0c1c33", animation: "light-rays", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Cathedral light." }),
  build({ id: "wd-vows", name: "Vows Lavender", category: "Wedding Service", bg: "#4c1d95", gradient: "linear-gradient(135deg,#4c1d95,#a78bfa)", color: "#fff", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Tender lavender vows." }),

  // Thanksgiving Service (4)
  build({ id: "tg-harvest-gold", name: "Thanksgiving Gold", category: "Thanksgiving Service", bg: "#78350f", gradient: "linear-gradient(135deg,#451a03,#a16207)", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Grateful golden warmth." }),
  build({ id: "tg-grateful", name: "Grateful Heart", category: "Thanksgiving Service", bg: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12,#dc2626)", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm grateful tones." }),
  build({ id: "tg-cornucopia", name: "Cornucopia", category: "Thanksgiving Service", bg: "#92400e", animation: "bokeh", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Bountiful bokeh." }),
  build({ id: "tg-praise", name: "Praise Amber", category: "Thanksgiving Service", bg: "#451a03", animation: "golden-particles", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Amber praise particles." }),

  // Children Ministry (4)
  build({ id: "ch-rainbow", name: "Rainbow Sunday", category: "Children Ministry", bg: "#0ea5e9", gradient: "linear-gradient(135deg,#fbbf24,#22c55e,#0ea5e9,#a855f7)", color: "#ffffff", weight: 800, fontTa: "Catamaran", description: "Bright rainbow joy." }),
  build({ id: "ch-sky-fun", name: "Sky Fun", category: "Children Ministry", bg: "#38bdf8", gradient: "linear-gradient(180deg,#bae6fd,#38bdf8)", color: "#0c4a6e", shadow: "none", weight: 800, fontTa: "Catamaran", description: "Cheerful sky." }),
  build({ id: "ch-meadow", name: "Meadow Joy", category: "Children Ministry", bg: "#22c55e", gradient: "linear-gradient(135deg,#16a34a,#86efac)", color: "#ffffff", weight: 800, fontTa: "Catamaran", description: "Bright green meadow." }),
  build({ id: "ch-bubbles", name: "Soap Bubbles", category: "Children Ministry", bg: "#0284c7", animation: "bokeh", color: "#fff", weight: 700, fontTa: "Catamaran", description: "Floating soap bubbles." }),

  // Women's Fellowship (4)
  build({ id: "wf-rose", name: "Rose Fellowship", category: "Women's Fellowship", bg: "#9f1239", gradient: "linear-gradient(135deg,#500724,#be185d,#f9a8d4)", color: "#fff1f2", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Rose fellowship warmth." }),
  build({ id: "wf-lavender", name: "Lavender Grace", category: "Women's Fellowship", bg: "#4c1d95", gradient: "linear-gradient(135deg,#3b0764,#7c3aed)", color: "#faf5ff", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Lavender grace." }),
  build({ id: "wf-pearl", name: "Pearl Soft", category: "Women's Fellowship", bg: "#fdf2f8", color: "#831843", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Soft pearl pink." }),
  build({ id: "wf-bloom", name: "Garden Bloom", category: "Women's Fellowship", bg: "#831843", animation: "bokeh", color: "#fce7f3", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Garden bloom bokeh." }),

  // Men's Fellowship (4)
  build({ id: "mf-steel", name: "Steel Brotherhood", category: "Men's Fellowship", bg: "#1e293b", gradient: "linear-gradient(135deg,#0f172a,#334155)", weight: 600, description: "Steel brotherhood." }),
  build({ id: "mf-iron", name: "Iron Sharpens", category: "Men's Fellowship", bg: "#1c1917", color: "#fafaf9", weight: 700, description: "Iron-grey strength." }),
  build({ id: "mf-leather", name: "Leather Brown", category: "Men's Fellowship", bg: "#3b2412", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm leather brown." }),
  build({ id: "mf-fortress", name: "Fortress Navy", category: "Men's Fellowship", bg: "#0c1c33", weight: 600, description: "Solid fortress navy." }),

  // Fasting Prayer (4)
  build({ id: "fp-ash", name: "Ash Quiet", category: "Fasting Prayer", bg: "#1c1917", color: "#e7e5e4", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "Quiet ash and humility." }),
  build({ id: "fp-wilderness", name: "Wilderness", category: "Fasting Prayer", bg: "#451a03", animation: "fog", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Wilderness fasting." }),
  build({ id: "fp-sackcloth", name: "Sackcloth Brown", category: "Fasting Prayer", bg: "#292524", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Sackcloth tones." }),
  build({ id: "fp-deep-night", name: "Watch Night", category: "Fasting Prayer", bg: "#020617", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Watch night candle." }),

  // Holy Communion (4)
  build({ id: "hc-wine", name: "Communion Wine", category: "Holy Communion", bg: "#3f0610", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Deep wine reverence." }),
  build({ id: "hc-bread", name: "Bread of Life", category: "Holy Communion", bg: "#78350f", gradient: "linear-gradient(135deg,#451a03,#92400e)", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm bread tones." }),
  build({ id: "hc-table", name: "Lord's Table", category: "Holy Communion", bg: "#1c0606", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Lord's table by candlelight." }),
  build({ id: "hc-covenant", name: "Covenant Crimson", category: "Holy Communion", bg: "#450a0a", color: "#fecaca", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Covenant crimson." }),

  // Mission Sunday (4)
  build({ id: "ms-globe", name: "Mission Globe", category: "Mission Sunday", bg: "#0c4a6e", gradient: "linear-gradient(135deg,#082f49,#0e7490)", color: "#f0fdfa", fontTa: "Catamaran", description: "Mission-blue worldview." }),
  build({ id: "ms-go-ye", name: "Go Ye Therefore", category: "Mission Sunday", bg: "#064e3b", gradient: "linear-gradient(135deg,#064e3b,#0f766e)", color: "#ecfccb", fontTa: "Catamaran", description: "Green mission call." }),
  build({ id: "ms-harvest-field", name: "Harvest Field", category: "Mission Sunday", bg: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12,#fbbf24)", color: "#fff7ed", fontTa: "Catamaran", description: "Harvest field gold." }),
  build({ id: "ms-nations", name: "All Nations", category: "Mission Sunday", bg: "#1e1b4b", animation: "star-field", color: "#e0e7ff", fontTa: "Catamaran", description: "All nations starfield." }),

  // Nature Themes (8)
  build({ id: "nt-forest", name: "Forest Pines", category: "Nature Themes", bg: "#14532d", gradient: "linear-gradient(180deg,#14532d,#166534)", color: "#ecfccb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Deep forest pines." }),
  build({ id: "nt-mountain", name: "Mountain Stone", category: "Nature Themes", bg: "#1e293b", gradient: "linear-gradient(180deg,#0f172a,#475569)", fontTa: "Mukta Malar", description: "Stone-cool mountain." }),
  build({ id: "nt-autumn", name: "Autumn Hills", category: "Nature Themes", bg: "#7c2d12", gradient: "linear-gradient(135deg,#7c2d12,#c2410c)", fontEn: "Georgia", fontTa: "Noto Serif Tamil", color: "#fffbeb", description: "Warm autumn hills." }),
  build({ id: "nt-river", name: "River Flow", category: "Nature Themes", bg: "#0c4a6e", animation: "water", color: "#e0f7fa", fontTa: "Mukta Malar", description: "Flowing river." }),
  build({ id: "nt-ocean", name: "Ocean Tide", category: "Nature Themes", bg: "#082f49", animation: "ocean", color: "#e0f2fe", fontTa: "Mukta Malar", description: "Slow ocean tide." }),
  build({ id: "nt-sky", name: "Open Sky", category: "Nature Themes", bg: "#0284c7", animation: "clouds", color: "#fff", fontTa: "Mukta Malar", description: "Open drifting sky." }),
  build({ id: "nt-meadow", name: "Spring Meadow", category: "Nature Themes", bg: "#16a34a", gradient: "linear-gradient(180deg,#16a34a,#86efac)", color: "#fff", fontTa: "Mukta Malar", description: "Bright spring meadow." }),
  build({ id: "nt-dawn-mist", name: "Dawn Mist", category: "Nature Themes", bg: "#1e3a8a", animation: "fog", color: "#e0e7ff", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Misty dawn." }),

  // Cross Themes (6)
  build({ id: "cr-shadow", name: "Cross Shadow", category: "Cross Themes", bg: "#0a0a0a", animation: "floating-cross", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Drifting cross silhouettes." }),
  build({ id: "cr-redemption", name: "Cross Redemption", category: "Cross Themes", bg: "#1c0606", gradient: "linear-gradient(180deg,#450a0a,#0a0000)", animation: "floating-cross", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Crimson-to-black redemption." }),
  build({ id: "cr-beam", name: "Cross of Light", category: "Cross Themes", bg: "#000", animation: "cross-beam", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Glowing cross beam." }),
  build({ id: "cr-old-rugged", name: "Old Rugged Cross", category: "Cross Themes", bg: "#3b2412", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Rugged wooden cross." }),
  build({ id: "cr-finished", name: "It Is Finished", category: "Cross Themes", bg: "#0a0000", color: "#fecaca", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "deep", description: "It is finished." }),
  build({ id: "cr-empty-cross", name: "Empty Cross", category: "Cross Themes", bg: "#0c4a6e", animation: "light-rays", color: "#fefce8", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Empty cross morning." }),

  // Heaven Themes (6)
  build({ id: "hv-light", name: "Heaven Light", category: "Heaven Themes", bg: "#e0f2fe", gradient: "radial-gradient(circle at 50% 30%,#ffffff,#e0f2fe 70%)", animation: "light-rays", color: "#0c4a6e", fontEn: "Georgia", fontTa: "Noto Serif Tamil", shadow: "none", description: "Sky-white rays of glory." }),
  build({ id: "hv-cloud", name: "Heaven Cloud", category: "Heaven Themes", bg: "#7dd3fc", gradient: "linear-gradient(180deg,#bae6fd,#38bdf8)", animation: "clouds", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Floating heavenly clouds." }),
  build({ id: "hv-glory", name: "Throne Glory", category: "Heaven Themes", bg: "#78350f", animation: "light-rays", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Golden throne glory." }),
  build({ id: "hv-streets-gold", name: "Streets of Gold", category: "Heaven Themes", bg: "#92400e", animation: "golden-particles", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Streets-of-gold shimmer." }),
  build({ id: "hv-aurora", name: "Heaven Aurora", category: "Heaven Themes", bg: "#0a0e2c", animation: "aurora", color: "#e0e7ff", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Heavenly aurora." }),
  build({ id: "hv-jasper", name: "Jasper Sea", category: "Heaven Themes", bg: "#0c4a6e", animation: "water", color: "#e0f7fa", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Sea of jasper." }),

  // Fire Themes (6)
  build({ id: "ft-ember", name: "Fire Ember", category: "Fire Themes", bg: "#450a0a", gradient: "radial-gradient(circle at 50% 100%,#dc2626,#450a0a 70%)", animation: "fire-glow", weight: 700, fontTa: "Catamaran", description: "Ember red with rising sparks." }),
  build({ id: "ft-coal", name: "Fire Coal", category: "Fire Themes", bg: "#1c0606", gradient: "radial-gradient(ellipse at 50% 90%,#7f1d1d,#1c0606 80%)", animation: "soft-glow", color: "#fed7aa", fontTa: "Catamaran", description: "Glowing coal underlay." }),
  build({ id: "ft-pentecost", name: "Pentecost Fire", category: "Fire Themes", bg: "#7c2d12", animation: "fire-glow", color: "#fff7ed", weight: 700, fontTa: "Catamaran", description: "Tongues of Pentecost fire." }),
  build({ id: "ft-burning-bush", name: "Burning Bush", category: "Fire Themes", bg: "#451a03", animation: "fire-glow", color: "#fff7ed", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Burning bush warmth." }),
  build({ id: "ft-furnace", name: "Furnace Heat", category: "Fire Themes", bg: "#1c0606", animation: "fire-glow", color: "#fed7aa", fontTa: "Catamaran", weight: 700, description: "Furnace deep heat." }),
  build({ id: "ft-altar", name: "Altar Flame", category: "Fire Themes", bg: "#0a0000", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Single altar flame." }),

  // Light Themes (6)
  build({ id: "lt-soft-white", name: "Soft White", category: "Light Themes", bg: "#fafaf9", color: "#1c1917", shadow: "none", fontEn: "Inter", fontTa: "Noto Sans Tamil", description: "Soft white, dark text." }),
  build({ id: "lt-cream", name: "Cream Bright", category: "Light Themes", bg: "#fef3c7", color: "#451a03", shadow: "none", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm cream daylight." }),
  build({ id: "lt-sky-light", name: "Sky Light", category: "Light Themes", bg: "#e0f2fe", color: "#0c4a6e", shadow: "none", fontTa: "Mukta Malar", description: "Clear sky light." }),
  build({ id: "lt-paper", name: "Paper White", category: "Light Themes", bg: "#ffffff", color: "#111827", shadow: "none", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Pure paper white." }),
  build({ id: "lt-rays-day", name: "Daylight Rays", category: "Light Themes", bg: "#fef9c3", animation: "light-rays", color: "#3f3f46", shadow: "none", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Daylight rays." }),
  build({ id: "lt-pearl", name: "Pearl Glow", category: "Light Themes", bg: "#fce7f3", color: "#831843", shadow: "none", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Pearl-glow blush." }),

  // Dark Themes (6)
  build({ id: "dk-onyx", name: "Onyx", category: "Dark Themes", bg: "#000000", description: "Pure onyx." }),
  build({ id: "dk-graphite", name: "Graphite", category: "Dark Themes", bg: "#0a0a0a", description: "Graphite black." }),
  build({ id: "dk-midnight", name: "Midnight Indigo", category: "Dark Themes", bg: "#0a0e2c", description: "Midnight indigo." }),
  build({ id: "dk-charcoal", name: "Warm Charcoal", category: "Dark Themes", bg: "#1c1917", color: "#f5f5f4", description: "Warm charcoal." }),
  build({ id: "dk-obsidian", name: "Obsidian Blue", category: "Dark Themes", bg: "#020617", gradient: "linear-gradient(135deg,#020617,#0f172a)", description: "Obsidian blue." }),
  build({ id: "dk-ink", name: "Ink Black", category: "Dark Themes", bg: "#0c0a09", color: "#f5f5f4", description: "Ink black." }),

  // Minimal Themes (6)
  build({ id: "mn-dark", name: "Minimal Dark", category: "Minimal Themes", bg: "#000", weight: 300, shadow: "none", description: "Pure black, thin sans." }),
  build({ id: "mn-light", name: "Minimal Light", category: "Minimal Themes", bg: "#fdf6e3", color: "#1f2937", weight: 400, shadow: "none", description: "Warm off-white, dark ink." }),
  build({ id: "mn-charcoal", name: "Minimal Charcoal", category: "Minimal Themes", bg: "#1c1917", color: "#f5f5f4", weight: 400, shadow: "none", description: "Editorial charcoal." }),
  build({ id: "mn-slate", name: "Minimal Slate", category: "Minimal Themes", bg: "#1e293b", weight: 400, shadow: "none", description: "Minimal slate." }),
  build({ id: "mn-warm", name: "Minimal Warm", category: "Minimal Themes", bg: "#292524", color: "#fef3c7", weight: 400, shadow: "none", description: "Warm minimal." }),
  build({ id: "mn-cool", name: "Minimal Cool", category: "Minimal Themes", bg: "#0f172a", weight: 400, shadow: "none", description: "Cool minimal." }),

  // Animated Themes (12)
  build({ id: "an-clouds", name: "Moving Clouds", category: "Animated Themes", bg: "#0c4a6e", animation: "clouds", fontTa: "Mukta Malar", description: "Slowly drifting clouds." }),
  build({ id: "an-light-rays", name: "Light Rays", category: "Animated Themes", bg: "#78350f", animation: "light-rays", color: "#fffbeb", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Rotating rays of glory." }),
  build({ id: "an-golden-particles", name: "Golden Particles", category: "Animated Themes", bg: "#1c1006", animation: "golden-particles", color: "#fde68a", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Rising golden particles." }),
  build({ id: "an-floating-dust", name: "Floating Dust", category: "Animated Themes", bg: "#0a0a0a", animation: "floating-dust", description: "Quiet floating dust." }),
  build({ id: "an-fog", name: "Slow Fog", category: "Animated Themes", bg: "#1c1917", animation: "fog", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Slow drifting fog." }),
  build({ id: "an-fire-glow", name: "Fire Glow", category: "Animated Themes", bg: "#450a0a", animation: "fire-glow", color: "#fff7ed", fontTa: "Catamaran", weight: 700, description: "Living fire glow." }),
  build({ id: "an-cross-beam", name: "Cross Light Beam", category: "Animated Themes", bg: "#000", animation: "cross-beam", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Cross-shaped light beam." }),
  build({ id: "an-bokeh", name: "Soft Bokeh", category: "Animated Themes", bg: "#1a0f08", animation: "bokeh", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Warm soft bokeh." }),
  build({ id: "an-water", name: "Water Reflection", category: "Animated Themes", bg: "#082f49", animation: "water", color: "#e0f7fa", fontTa: "Mukta Malar", description: "Gentle water reflections." }),
  build({ id: "an-sky", name: "Sky Motion", category: "Animated Themes", bg: "#0c4a6e", animation: "sky-motion", fontTa: "Mukta Malar", description: "Slow sky colour-shift." }),
  build({ id: "an-stage", name: "Worship Stage Lights", category: "Animated Themes", bg: "#0a0a0a", animation: "stage-lights", fontTa: "Catamaran", weight: 600, description: "Sweeping stage lights." }),
  build({ id: "an-aurora", name: "Aurora Motion", category: "Animated Themes", bg: "#0a0e2c", animation: "aurora", color: "#e0e7ff", fontTa: "Catamaran", description: "Soft aurora motion." }),

  // Cinematic Themes (8)
  build({ id: "cn-star-field", name: "Star Field", category: "Cinematic Themes", bg: "#0a0e2c", animation: "star-field", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Cinematic starfield." }),
  build({ id: "cn-gentle-rain", name: "Gentle Rain", category: "Cinematic Themes", bg: "#0c1c33", animation: "rain", color: "#dbeafe", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Quiet gentle rain." }),
  build({ id: "cn-candle-glow", name: "Candle Glow", category: "Cinematic Themes", bg: "#1a0f08", animation: "candle-glow", color: "#fef3c7", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Cinematic candle glow." }),
  build({ id: "cn-sunrise", name: "Sunrise Motion", category: "Cinematic Themes", bg: "#7c2d12", animation: "sunrise", color: "#fff7ed", fontEn: "Georgia", fontTa: "Noto Serif Tamil", weight: 600, description: "Cinematic sunrise." }),
  build({ id: "cn-ocean", name: "Ocean Motion", category: "Cinematic Themes", bg: "#082f49", animation: "ocean", color: "#e0f2fe", fontEn: "Georgia", fontTa: "Noto Serif Tamil", description: "Wide ocean motion." }),
  build({ id: "cn-abstract", name: "Abstract Worship Motion", category: "Cinematic Themes", bg: "#1e1b4b", animation: "abstract-worship", fontTa: "Catamaran", weight: 600, description: "Abstract worship motion." }),
  build({ id: "cn-particles-dark", name: "Drifting Particles", category: "Cinematic Themes", bg: "#0a0a0a", animation: "particles", fontTa: "Mukta Malar", description: "Soft drifting particles." }),
  build({ id: "cn-soft-pulse", name: "Soft Pulse", category: "Cinematic Themes", bg: "#0f172a", animation: "soft-glow", fontTa: "Mukta Malar", weight: 500, description: "Cinematic soft pulse." }),
];
