/**
 * Configurable slide-splitting rules for text items.
 *
 *   - "blank" : split on blank lines (default, legacy behaviour)
 *   - "marker": split on a line containing only `---`
 *   - "para"  : every non-empty line is its own slide
 *   - "lines" : every N lines becomes a slide
 *   - "chars" : roughly every N characters at the nearest line break
 */
export type SplitRule =
  | { mode: "blank" }
  | { mode: "marker"; marker?: string }
  | { mode: "para" }
  | { mode: "lines"; n: number }
  | { mode: "chars"; n: number };

export const DEFAULT_SPLIT: SplitRule = { mode: "blank" };

export const SPLIT_LABELS: Record<SplitRule["mode"], string> = {
  blank: "Blank line",
  marker: "--- marker",
  para: "Per paragraph",
  lines: "Every N lines",
  chars: "Every N chars",
};

export function splitByRule(content: string, rule: SplitRule = DEFAULT_SPLIT): string[] {
  const text = (content ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  switch (rule.mode) {
    case "blank":
      return text.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);

    case "marker": {
      const m = rule.marker ?? "---";
      const re = new RegExp(`\\n\\s*${escapeRe(m)}\\s*\\n`, "g");
      return text.split(re).map((s) => s.trim()).filter(Boolean);
    }

    case "para":
      return text.split(/\n+/).map((s) => s.trim()).filter(Boolean);

    case "lines": {
      const lines = text.split("\n");
      const n = Math.max(1, rule.n | 0);
      const out: string[] = [];
      for (let i = 0; i < lines.length; i += n) {
        const slice = lines.slice(i, i + n).join("\n").trim();
        if (slice) out.push(slice);
      }
      return out;
    }

    case "chars": {
      const n = Math.max(40, rule.n | 0);
      const lines = text.split("\n");
      const out: string[] = [];
      let buf = "";
      for (const line of lines) {
        if (buf.length + line.length + 1 > n && buf) {
          out.push(buf.trim());
          buf = "";
        }
        buf += (buf ? "\n" : "") + line;
      }
      if (buf.trim()) out.push(buf.trim());
      return out;
    }
  }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
