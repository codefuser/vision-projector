/**
 * HighlightedText — wraps every match of any of the given tokens in a
 * <mark> for in-card search highlighting. Case-insensitive, safe for
 * Unicode (Tamil) input.
 */
import { useMemo } from "react";

interface Props {
  text: string;
  tokens: string[];
  className?: string;
}

export function HighlightedText({ text, tokens, className }: Props) {
  const parts = useMemo(() => {
    const valid = tokens.map((t) => t.trim()).filter((t) => t.length >= 2);
    if (valid.length === 0) return [{ s: text, hit: false }];
    const escaped = valid
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);
    const re = new RegExp(`(${escaped.join("|")})`, "giu");
    const out: { s: string; hit: boolean }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ s: text.slice(last, m.index), hit: false });
      out.push({ s: m[0], hit: true });
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) out.push({ s: text.slice(last), hit: false });
    return out;
  }, [text, tokens]);

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded bg-amber-400/30 px-0.5 text-foreground">
            {p.s}
          </mark>
        ) : (
          <span key={i}>{p.s}</span>
        ),
      )}
    </span>
  );
}
