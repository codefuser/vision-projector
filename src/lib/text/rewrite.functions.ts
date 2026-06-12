/**
 * AI rewrite server function — rewrites a block of text in one of 10 modes
 * using Lovable AI Gateway. Tamil-aware (preserves Tamil script, returns
 * Tamil output when input is Tamil).
 */
import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";

export type RewriteMode =
  | "expand"
  | "shorten"
  | "formal"
  | "simple"
  | "sermon"
  | "announcement"
  | "prayer"
  | "worship"
  | "youth"
  | "bible-study";

export const REWRITE_MODES: { id: RewriteMode; label: string; description: string }[] = [
  { id: "expand", label: "Expand", description: "Add detail and explanation" },
  { id: "shorten", label: "Shorten", description: "Tighten and condense" },
  { id: "formal", label: "Formal", description: "Reverent, respectful tone" },
  { id: "simple", label: "Simple", description: "Plain, easy-to-read language" },
  { id: "sermon", label: "Sermon style", description: "Preaching cadence with points" },
  { id: "announcement", label: "Announcement", description: "Clear notice with date/time/venue" },
  { id: "prayer", label: "Prayer", description: "Heartfelt prayer voice" },
  { id: "worship", label: "Worship", description: "Worshipful, devotional tone" },
  { id: "youth", label: "Youth", description: "Friendly, energetic for young people" },
  { id: "bible-study", label: "Bible study", description: "Structured study notes" },
];

const MODE_PROMPTS: Record<RewriteMode, string> = {
  expand: "Expand the text with helpful supporting detail and clearer explanation. Keep the original meaning intact.",
  shorten: "Tighten and condense the text. Keep the core meaning, remove filler.",
  formal: "Rewrite in a formal, reverent tone suitable for a worship service.",
  simple: "Rewrite in plain, simple language anyone can read aloud.",
  sermon: "Rewrite in a sermon style — clear main points, illustration, and application. Use short paragraphs.",
  announcement: "Rewrite as a church announcement — clear lead line, then bullet points for Date, Time, Venue, Contact if implied.",
  prayer: "Rewrite as a heartfelt prayer in the second person addressing God.",
  worship: "Rewrite in a worshipful, devotional tone with reverence and praise.",
  youth: "Rewrite in a friendly, energetic voice that engages young people without losing meaning.",
  "bible-study": "Rewrite as structured Bible study notes — Observation, Interpretation, Application.",
};

interface Input {
  mode: RewriteMode;
  text: string;
}

export const rewriteText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): Input => {
    const d = data as Partial<Input>;
    if (!d || typeof d.text !== "string" || !d.text.trim()) throw new Error("Empty text");
    if (!d.mode || !(d.mode in MODE_PROMPTS)) throw new Error("Invalid mode");
    return { mode: d.mode, text: d.text };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const hasTamil = /[\u0B80-\u0BFF]/.test(data.text);
    const langHint = hasTamil
      ? "The input is in Tamil. Respond in Tamil using natural church/worship vocabulary."
      : "Respond in the same language as the input.";

    const system =
      "You are an editor for a Tamil church projection app (Vision Projector). " +
      "Rewrite the user's text per the instruction. Preserve names, scripture references and meaning. " +
      "Use blank lines to separate slide-sized chunks when appropriate. " +
      langHint;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: `Instruction: ${MODE_PROMPTS[data.mode]}\n\nText:\n${data.text}`,
      });
      return { text: text.trim() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/402/.test(msg)) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      if (/429/.test(msg)) throw new Error("AI rate limit hit. Please try again shortly.");
      throw new Error(`AI rewrite failed: ${msg}`);
    }
  });
