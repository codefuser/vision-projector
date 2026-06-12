/**
 * LogoLayer — absolute-positioned overlay rendered on top of all projector
 * content. Reacts to either a local LogoConfig (used inside the Live
 * Preview) or a broadcast LogoConfig from the projection state.
 *
 * Gated by the master `logoEnabled` toggle in `useBackground` so the
 * operator can hide all logos without touching individual settings.
 */
import type { LogoBroadcast } from "@/lib/broadcast";
import { useBackground } from "@/stores/background.store";

interface Props {
  logo: LogoBroadcast | null | undefined;
}

export function LogoLayer({ logo }: Props) {
  const logoEnabled = useBackground((s) => s.logoEnabled);
  if (!logoEnabled) return null;
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
