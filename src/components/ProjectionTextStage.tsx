import { useEffect, useRef, useState, type RefObject } from "react";
import { BackgroundLayer } from "@/components/BackgroundLayer";
import { LogoLayer } from "@/components/LogoLayer";
import { TextOverlayRenderer } from "@/components/TextOverlayRenderer";
import {
  DEFAULT_GROUPED_STYLES,
  DEFAULT_TEXT_STYLE,
  type GroupedStyles,
  type LogoBroadcast,
  type TextOverlay,
  type TextStyle,
} from "@/lib/broadcast";
import { cn } from "@/lib/utils";

const STAGE_ASPECT = 16 / 9;
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;

interface ProjectionTextStageProps {
  overlay: TextOverlay;
  textStyle?: TextStyle | null;
  groupedStyles?: GroupedStyles | null;
  logo?: LogoBroadcast | null;
  className?: string;
}

export function ProjectionTextStage({
  overlay,
  textStyle,
  groupedStyles,
  logo,
  className,
}: ProjectionTextStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const size = useFittedStage(hostRef, STAGE_ASPECT);
  const effectiveGroups = groupedStyles ?? DEFAULT_GROUPED_STYLES;
  const scale = size ? size.width / STAGE_WIDTH : 1;

  return (
    <div
      ref={hostRef}
      className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-black", className)}
    >
      <div
        className="relative shrink-0 overflow-hidden bg-black"
        style={{
          width: size ? `${size.width}px` : "100%",
          height: size ? `${size.height}px` : "100%",
          aspectRatio: "16 / 9",
        }}
      >
        <div
          className="relative overflow-hidden bg-black"
          style={{
            width: `${STAGE_WIDTH}px`,
            height: `${STAGE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <BackgroundLayer background={effectiveGroups.background} />
          <TextOverlayRenderer
            overlay={overlay}
            style={textStyle ?? DEFAULT_TEXT_STYLE}
            styles={effectiveGroups}
            withBackground={false}
          />
          <LogoLayer logo={logo} />
        </div>
      </div>
    </div>
  );
}

function useFittedStage(ref: RefObject<HTMLDivElement | null>, aspect: number) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      let width = rect.width;
      let height = width / aspect;
      if (height > rect.height) {
        height = rect.height;
        width = height * aspect;
      }
      setSize((current) => {
        if (current && Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5) {
          return current;
        }
        return { width, height };
      });
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [aspect, ref]);

  return size;
}