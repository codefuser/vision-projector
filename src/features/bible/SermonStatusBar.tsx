import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Mic, ListOrdered, Square } from "lucide-react";
import { useBibleQueue } from "@/stores/bible-queue.store";
import { projectVerseAt } from "@/lib/bible/project-ref";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";

/**
 * Live Sermon status strip — shown at the top of the Bible panel whenever
 * sermon mode is active. Surfaces the current/prev/next verse, queue count,
 * and quick navigation so the operator never loses context.
 */
export function SermonStatusBar() {
  const { items, currentIndex, sermonMode, toggleSermon, setCurrentIndex } = useBibleQueue();
  const projectedRef = useProjection((s) => s.state?.textOverlay?.reference ?? null);

  if (!sermonMode) return null;

  const current = items[currentIndex] ?? null;
  const prev = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;

  const go = (delta: number) => {
    const ni = currentIndex + delta;
    if (ni < 0 || ni >= items.length) return;
    const it = items[ni];
    if (!it) return;
    if (projectVerseAt(it)) setCurrentIndex(ni);
  };

  return (
    <div className="flex items-center gap-2 border-b border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px]">
      <Mic className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="shrink-0 font-semibold uppercase tracking-wide text-primary">Sermon</span>
      <button
        onClick={() => go(-1)}
        disabled={!prev}
        className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
        title="Previous (←)"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1 truncate">
        {current ? (
          <span>
            <span className="font-semibold text-foreground">{current.ref}</span>
            <span className="ml-1 text-muted-foreground">· {current.text.slice(0, 60)}…</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Queue is empty — enqueue verses to begin.</span>
        )}
      </div>
      <button
        onClick={() => go(+1)}
        disabled={!next}
        className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
        title="Next (→)"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-background px-1.5 py-0.5 text-muted-foreground">
        <ListOrdered className="h-3 w-3" />
        {items.length}
      </span>
      <button
        onClick={toggleSermon}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Exit sermon mode (Ctrl+M)"
      >
        <Square className="h-3 w-3" />
      </button>
    </div>
  );
}
