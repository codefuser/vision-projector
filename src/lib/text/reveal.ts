/**
 * Reveal expansion — turns a slide containing a bulleted/numbered list into
 * a progressive sequence of sub-slides (Title → +Point 1 → +Point 1+2 …).
 *
 * Recognised list markers at line start: •  -  *  digits followed by . or )
 * The slide must have ≥2 such lines and at least one non-list "header" line
 * before them (otherwise it's already a clean list slide).
 */

const LIST_RE = /^(\s*)(•|-|\*|\d+[.)])\s+(.+)$/;

export interface RevealSlide {
  text: string;
  /** True for the original / non-expanded slide. */
  base: boolean;
}

export function expandReveal(slide: string): RevealSlide[] {
  const lines = slide.split("\n");
  const listIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (LIST_RE.test(lines[i])) listIdx.push(i);
  }
  if (listIdx.length < 2) return [{ text: slide, base: true }];

  const out: RevealSlide[] = [];
  // First reveal step: header only (everything before first list line).
  const firstList = listIdx[0];
  const header = lines.slice(0, firstList).join("\n").trimEnd();
  if (header) out.push({ text: header, base: true });

  // Each subsequent step adds one more list item.
  for (let n = 1; n <= listIdx.length; n++) {
    const lastInclude = listIdx[n - 1];
    const partial = lines.slice(0, lastInclude + 1).join("\n").trimEnd();
    out.push({ text: partial, base: false });
  }
  return out.length ? out : [{ text: slide, base: true }];
}

export function expandSlides(slides: string[], enabled: boolean): string[] {
  if (!enabled) return slides;
  const out: string[] = [];
  for (const s of slides) {
    for (const r of expandReveal(s)) out.push(r.text);
  }
  return out;
}
