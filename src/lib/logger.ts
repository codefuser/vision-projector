import { db } from "@/db/schema";

const MAX_LOGS = 1000;

async function write(level: "info" | "warn" | "error", message: string, ctx?: unknown) {
  if (typeof window === "undefined") return;
  try {
    const ctxStr = ctx instanceof Error ? `${ctx.message}\n${ctx.stack ?? ""}` : ctx ? JSON.stringify(ctx) : undefined;
    await db().logs.add({ level, message, ctx: ctxStr, ts: Date.now() });
    const count = await db().logs.count();
    if (count > MAX_LOGS) {
      const excess = count - MAX_LOGS;
      const oldest = await db().logs.orderBy("ts").limit(excess).primaryKeys();
      await db().logs.bulkDelete(oldest);
    }
  } catch {
    /* swallow */
  }
}

export const logger = {
  info: (msg: string, ctx?: unknown) => {
    console.info("[church-media]", msg, ctx ?? "");
    void write("info", msg, ctx);
  },
  warn: (msg: string, ctx?: unknown) => {
    console.warn("[church-media]", msg, ctx ?? "");
    void write("warn", msg, ctx);
  },
  error: (msg: string, ctx?: unknown) => {
    console.error("[church-media]", msg, ctx ?? "");
    void write("error", msg, ctx);
  },
};
