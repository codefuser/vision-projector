/**
 * TextOverlayRenderer — Phase 4
 *
 * Layered rendering:
 *   1. Background layer (color / image / video) — handled in ProjectionWindow,
 *      this component never draws backgrounds anymore (kept as no-op for
 *      `withBackground` so the API stays stable for non-Bible callers).
 *   2. Reference header — pinned at top using the reference SectionStyle.
 *   3. Verse body — Tamil/English/both, each with its own SectionStyle and
 *      auto-fit shrink-to-fit.
 *
 * Auto-fit: body text independently binary-searches the largest font size
 * that fits its allotted area. All sizing is calculated from this renderer's
 * own stage width so preview and projector use the same math.
 */
import { useEffect, useRef } from "react";
import type { GroupedStyles, SectionStyle, TextOverlay, TextStyle } from "@/lib/broadcast";
import {
  DEFAULT_GROUPED_STYLES,
} from "@/lib/broadcast";
import { useBackground } from "@/stores/background.store";

import { cn } from "@/lib/utils";

interface Props {
  overlay: TextOverlay;
  /** Legacy single style (still honoured for non-bilingual overlays). */
  style?: TextStyle;
  /** Phase-4 grouped styles (preferred). */
  styles?: GroupedStyles;
  withBackground?: boolean;
  className?: string;
}

export function TextOverlayRenderer({ overlay, style, styles, withBackground = true, className }: Props) {
  const grouped: GroupedStyles = styles ?? DEFAULT_GROUPED_STYLES;
  // Backward-compat: if a legacy `style` is supplied (no grouped), use it as
  // english base and synthesize reference/tamil from it.
  const effective: GroupedStyles = styles
    ? grouped
    : style
      ? {
          reference: { ...grouped.reference, color: style.color },
          tamil: { ...style, visible: true, fontFamily: "Latha" },
          english: { ...style, visible: true },
          background: grouped.background,
        }
      : grouped;

  const isBilingual = overlay.mode === "both" && overlay.textEn && overlay.textTa;
  const showEnglish = effective.english.visible && (overlay.mode !== "ta");
  const showTamil = effective.tamil.visible && (overlay.mode === "ta" || overlay.mode === "both");

  // Reference header — pick based on mode
  const referenceLines: string[] = [];
  if (effective.reference.visible) {
    if (overlay.mode === "ta" && overlay.referenceTa) referenceLines.push(overlay.referenceTa);
    else if (overlay.mode === "en" && overlay.referenceEn) referenceLines.push(overlay.referenceEn);
    else if (overlay.mode === "both") {
      if (overlay.referenceTa) referenceLines.push(overlay.referenceTa);
      if (overlay.referenceEn) referenceLines.push(overlay.referenceEn);
    } else if (overlay.reference) {
      referenceLines.push(overlay.reference);
    }
  }

  const tamilText = overlay.textTa ?? (overlay.mode === "ta" ? overlay.text : overlay.subtext) ?? "";
  const englishText = overlay.textEn ?? (overlay.mode === "en" ? overlay.text : !isBilingual ? overlay.text : "") ?? "";

  return (
    <div
      className={cn("absolute inset-0 flex flex-col overflow-hidden", className)}
      style={{
        background: withBackground && effective.background.kind === "color"
          ? effective.background.color
          : "transparent",
      }}
    >
      {referenceLines.length > 0 && (
        <ReferenceBlock lines={referenceLines} style={effective.reference} />
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {showTamil && tamilText && (
          <VerseBlock text={tamilText} style={effective.tamil} flex={showEnglish ? 1 : 1} />
        )}
        {showEnglish && englishText && (
          <VerseBlock text={englishText} style={effective.english} flex={1} />
        )}
        {!showTamil && !showEnglish && overlay.text && (
          <VerseBlock text={overlay.text} style={effective.english} flex={1} />
        )}
      </div>
    </div>
  );
}

function ReferenceBlock({ lines, style }: { lines: string[]; style: SectionStyle }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const apply = () => {
      const width = stage.clientWidth;
      if (!width) return;
      const fontPx = (style.fontSizeVw / 100) * width;
      const paddingPx = (style.paddingVw / 100) * width;
      stage.style.padding = `${paddingPx}px ${paddingPx}px 0 ${paddingPx}px`;
      for (const el of lineRefs.current) {
        if (el) el.style.fontSize = `${fontPx}px`;
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [style.fontSizeVw, style.paddingVw]);

  return (
    <div
      ref={stageRef}
      className="shrink-0"
      style={{
        textAlign: style.align,
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          ref={(el) => { lineRefs.current[i] = el; }}
          style={{ ...textCss(style), fontSize: 0 }}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

function VerseBlock({ text, style, flex }: { text: string; style: SectionStyle; flex: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const t = textRef.current;
    if (!stage || !t) return;
    const fit = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (w === 0 || h === 0) return;
      const pad = (style.paddingVw / 100) * w;
      stage.style.padding = `${pad}px`;
      const maxW = w - pad * 2;
      const maxH = h - pad * 2;
      const startPx = (style.fontSizeVw / 100) * w;
      const minPx = Math.max(10, w * 0.012);
      let lo = minPx, hi = startPx, best = lo;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        t.style.fontSize = `${mid}px`;
        const overflow = t.scrollWidth > maxW + 1 || t.scrollHeight > maxH + 1;
        if (overflow) hi = mid;
        else { best = mid; lo = mid; }
        if (hi - lo < 0.5) break;
      }
      t.style.fontSize = `${best}px`;
    };
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [text, style.fontSizeVw, style.fontFamily, style.fontWeight, style.lineHeight, style.letterSpacing, style.paddingVw]);

  const vAlignClass =
    style.vAlign === "top" ? "items-start" : style.vAlign === "bottom" ? "items-end" : "items-center";
  const justifyClass =
    style.align === "left" ? "justify-start" : style.align === "right" ? "justify-end" : "justify-center";

  return (
    <div
      ref={stageRef}
      className={cn("relative flex min-h-0 w-full overflow-hidden", vAlignClass, justifyClass)}
      style={{ flex }}
    >
      <div
        ref={textRef}
        className="whitespace-pre-line"
        style={{ ...textCss(style), maxWidth: "100%", wordBreak: "break-word", textAlign: style.align }}
      >
        {text}
      </div>
    </div>
  );
}

function textCss(style: SectionStyle): React.CSSProperties {
  // Read master toggles synchronously — operators flip these in the
  // Layers panel and the projector picks them up via the broadcasted
  // style update that follows.
  const s = useBackground.getState();
  const shadowOn = s.textShadowEnabled;
  const strokeOn = s.textStrokeEnabled;
  const textShadow = style.shadow && shadowOn
    ? `0 4px ${style.shadowBlur}px ${mixAlpha(style.shadowColor, 0.6)}`
    : "none";

  return {
    fontFamily: `"${style.fontFamily}", system-ui, sans-serif`,
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? "italic" : "normal",
    textDecoration: style.underline ? "underline" : "none",
    color: style.color,
    opacity: style.textOpacity,
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}px`,
    textShadow,
    WebkitTextStrokeWidth: strokeOn && style.outlineWidth > 0 ? `${style.outlineWidth}px` : undefined,
    WebkitTextStrokeColor: strokeOn && style.outlineWidth > 0 ? style.outlineColor : undefined,
  };
}


function mixAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
