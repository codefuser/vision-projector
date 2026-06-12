/**
 * LogoLayer — absolute-positioned overlay rendered on top of all projector
 * content. Reacts to either a local LogoConfig (used inside the Live
 * Preview) or a broadcast LogoConfig from the projection state.
 */
import type { LogoBroadcast } from "@/lib/broadcast";

interface Props {
  logo: LogoBroadcast | null | undefined;
}

export function LogoLayer({ logo }: Props) {
  if (!logo || !logo.enabled || !logo.current) return null;
  const s = logo.settings;
  const style: React.CSSProperties = {
    position: "absolute",
    width: `${s.widthPct}%`,
    height: "auto",
    opacity: s.opacity,
    borderRadius: `${s.radius}px`,
    pointerEvents: "none",
    objectFit: "contain",
    filter: s.shadow ? "drop-shadow(0 4px 12px rgba(0,0,0,0.6))" : undefined,
  };
  // Position presets vs custom (% from top-left).
  switch (s.position) {
    case "top-left":     style.top = "3%"; style.left = "3%"; break;
    case "top-right":    style.top = "3%"; style.right = "3%"; break;
    case "bottom-left":  style.bottom = "3%"; style.left = "3%"; break;
    case "bottom-right": style.bottom = "3%"; style.right = "3%"; break;
    case "custom":
      style.left = `${s.xPct}%`;
      style.top = `${s.yPct}%`;
      break;
  }
  return <img src={logo.current.dataUrl} alt="" style={style} draggable={false} />;
}
