/**
 * TextOverlayRenderer — a single component that renders any projectable
 * text payload (Bible verse, song slide, free text) with the active
 * formatting style and automatic font shrink-to-fit. Used by BOTH the
 * projector window and the Live Preview mirror so what the operator sees
 * is exactly what the congregation sees.
 *
 * Auto-fit strategy:
 *  - We start at `style.fontSizeVw` (interpreted relative to the stage's
 *    own width — not the viewport — so a small preview pane stays a true
 *    miniature of a 1080p projector).
 *  - We shrink (never enlarge) via a quick binary search until the text
 *    fits inside the stage minus the configured padding.
 *  - ResizeObserver re-fits when the stage size changes; MutationObserver
 *    re-fits when text content changes.
 *  - Hard floor of 1.2vw so verses never become unreadable.
 */
import { useEffect, useRef } from "react";
import type { TextOverlay, TextStyle } from "@/lib/broadcast";
import { cn } from "@/lib/utils";

interface Props {
  overlay: TextOverlay;
  style: TextStyle;
  /** When true, renders the full opaque background. When false (used by
   *  the preview mirror) the surrounding stage already provides the bg. */
  withBackground?: boolean;
  className?: string;
}

export function TextOverlayRenderer({ overlay, style, withBackground = true, className }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const refRef = useRef<HTMLDivElement>(null);

  // Auto-fit — recompute on size change, content change, or style change.
  useEffect(() => {
    const stage = stageRef.current;
    const text = textRef.current;
    if (!stage || !text) return;

    const fit = () => {
      const stageW = stage.clientWidth;
      const stageH = stage.clientHeight;
      if (stageW === 0 || stageH === 0) return;
      const padding = (style.paddingVw / 100) * stageW;
      const maxW = stageW - padding * 2;
      const refH = refRef.current?.offsetHeight ?? 0;
      const reservedBottom = 12 + refH; // small gap + reference line
      const maxH = stageH - padding * 2 - reservedBottom;

      const startPx = (style.fontSizeVw / 100) * stageW;
      const minPx = Math.max(10, stageW * 0.012);
      let lo = minPx;
      let hi = startPx;
      // Binary search: find largest size ≤ hi that fits.
      let best = lo;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        text.style.fontSize = `${mid}px`;
        // Force reflow.
        const overflow =
          text.scrollWidth > maxW + 1 || text.scrollHeight > maxH + 1;
        if (overflow) {
          hi = mid;
        } else {
          best = mid;
          lo = mid;
        }
        if (hi - lo < 0.5) break;
      }
      text.style.fontSize = `${best}px`;
    };

    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [
    overlay.text,
    overlay.subtext,
    style.fontSizeVw,
    style.fontFamily,
    style.fontWeight,
    style.lineHeight,
    style.letterSpacing,
    style.paddingVw,
  ]);

  const bgColor = withBackground ? mixAlpha(style.background, style.bgOpacity) : "transparent";
  const align = style.align;
  const vAlignClass =
    style.vAlign === "top" ? "items-start" : style.vAlign === "bottom" ? "items-end" : "items-center";
  const justifyClass =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";

  const textShadow = style.shadow
    ? `0 4px ${style.shadowBlur}px ${mixAlpha(style.shadowColor, 0.6)}`
    : "none";
  const textStroke =
    style.outlineWidth > 0
      ? `${style.outlineWidth}px ${style.outlineColor}`
      : undefined;

  return (
    <div
      ref={stageRef}
      className={cn("absolute inset-0 flex overflow-hidden", vAlignClass, justifyClass, className)}
      style={{
        background: bgColor,
        padding: `${style.paddingVw}%`,
      }}
    >
      <div className="flex w-full max-w-full flex-col" style={{ alignItems: alignToFlex(align) }}>
        <div
          ref={textRef}
          className="whitespace-pre-line"
          style={{
            fontFamily: `"${style.fontFamily}", system-ui, sans-serif`,
            fontWeight: style.fontWeight,
            fontStyle: style.italic ? "italic" : "normal",
            textDecoration: style.underline ? "underline" : "none",
            color: style.color,
            opacity: style.textOpacity,
            textAlign: align,
            lineHeight: style.lineHeight,
            letterSpacing: `${style.letterSpacing}px`,
            textShadow,
            WebkitTextStrokeWidth: textStroke ? `${style.outlineWidth}px` : undefined,
            WebkitTextStrokeColor: textStroke ? style.outlineColor : undefined,
            maxWidth: "100%",
            wordBreak: "break-word",
          }}
        >
          {overlay.text}
        </div>
        {overlay.subtext && (
          <div
            className="mt-[2vh] whitespace-pre-line"
            style={{
              fontFamily: `"${style.fontFamily}", system-ui, sans-serif`,
              fontWeight: Math.max(300, style.fontWeight - 100),
              color: style.color,
              opacity: style.textOpacity * 0.85,
              textAlign: align,
              lineHeight: style.lineHeight,
              fontSize: "0.7em",
            }}
          >
            {overlay.subtext}
          </div>
        )}
        <div
          ref={refRef}
          className="mt-[3vh] uppercase"
          style={{
            color: style.color,
            opacity: 0.7,
            fontSize: "0.32em",
            letterSpacing: "0.18em",
            textAlign: align,
          }}
        >
          {overlay.reference}
          {overlay.translation ? ` · ${overlay.translation}` : ""}
          {overlay.subtranslation ? ` / ${overlay.subtranslation}` : ""}
        </div>
      </div>
    </div>
  );
}

function alignToFlex(a: "left" | "center" | "right"): string {
  return a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";
}

function mixAlpha(hex: string, alpha: number): string {
  // Accept #rgb / #rrggbb. Falls back to hex if parse fails.
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}
