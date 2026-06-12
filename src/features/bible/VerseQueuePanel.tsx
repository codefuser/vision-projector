
import { ListOrdered, Play, X, Trash2, ChevronUp, ChevronDown, Send } from "lucide-react";
import { useBibleQueue } from "@/stores/bible-queue.store";
import { projectVerseAt } from "@/lib/bible/project-ref";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function VerseQueuePanel() {
  const { items, currentIndex, setCurrentIndex, remove, clear, move } = useBibleQueue();

  const playAt = (i: number) => {
    const it = items[i];
    if (!it) return;
    if (projectVerseAt(it)) {
      setCurrentIndex(i);
      toast.success(`Projecting ${it.ref}`);
    }
  };

  const playAll = () => {
    if (!items[0]) return;
    playAt(0);
  };

  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center text-xs text-muted-foreground">
        <ListOrdered className="mb-2 h-6 w-6 opacity-40" />
        <div>Queue is empty.</div>
        <div className="mt-1 opacity-70">
          Press <kbd className="rounded border px-1">Q</kbd> on any verse to enqueue.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
        <span className="text-[11px] font-semibold text-foreground">Queue · {items.length}</span>
        <button
          onClick={playAll}
          className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90"
          title="Start from first"
        >
          <Play className="h-3 w-3" /> Play
        </button>
        <button
          onClick={() => clear()}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Clear queue"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {items.map((it, i) => {
            const isCurrent = i === currentIndex;
            return (
              <li
                key={it.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md border px-2 py-1.5 transition",
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/30",
                )}
              >
                <span className="w-5 shrink-0 text-center text-[10px] font-mono text-muted-foreground">
                  {i + 1}
                </span>
                <button
                  onClick={() => playAt(i)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <div className="text-[11px] font-semibold text-primary">{it.ref}</div>
                  <div className="line-clamp-1 text-[11px] text-muted-foreground">{it.text}</div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => move(i, Math.max(0, i - 1))}
                    disabled={i === 0}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => move(i, Math.min(items.length - 1, i + 1))}
                    disabled={i === items.length - 1}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => playAt(i)}
                    className="rounded p-1 text-primary hover:bg-primary/10"
                    title="Project"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
