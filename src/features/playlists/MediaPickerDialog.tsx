import { useEffect, useMemo, useState } from "react";
import { Search, Check, Film, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listAllMedia } from "@/db/repo";
import type { MediaRecord } from "@/db/schema";
import { Thumb } from "@/components/Thumb";
import { formatDuration } from "@/lib/files";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onCancel: () => void;
  onAdd: (mediaIds: string[]) => void | Promise<void>;
}

/**
 * Browse the full media library and pick one or many items to append to a
 * playlist. Modal-only (no browser dialogs); supports search and multi-select.
 */
export function MediaPickerDialog({ open, onCancel, onAdd }: Props) {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setFilter("all");
    setSelected(new Set());
    setBusy(false);
    void (async () => {
      const all = await listAllMedia();
      setMedia(all.sort((a, b) => b.createdAt - a.createdAt));
    })();
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [media, query, filter]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleAdd = async () => {
    if (!selected.size) return;
    try {
      setBusy(true);
      // Preserve the order the user clicked (insertion order in Set)
      await onAdd(Array.from(selected));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="flex h-[80vh] max-h-[720px] max-w-3xl flex-col gap-3 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add media to playlist</DialogTitle>
          <DialogDescription>
            Select one or more items. They will be appended in the order you select them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search media…"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-input bg-background p-0.5">
            {(["all", "image", "video"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "cursor-pointer rounded px-2.5 py-1 text-xs font-medium capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? "All" : f + "s"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-md border border-border bg-card/40 p-2">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No media matches.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((m) => {
                const isSelected = selected.has(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "group relative cursor-pointer overflow-hidden rounded-md border bg-background text-left transition",
                      isSelected
                        ? "border-primary ring-2 ring-primary"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <Thumb media={m} className="aspect-video" />
                    {isSelected && (
                      <div className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="px-2 py-1.5">
                      <div className="truncate text-xs font-medium" title={m.name}>
                        {m.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {m.type === "video" ? (
                          <>
                            <Film className="h-3 w-3" />
                            <span className="tabular-nums">{formatDuration(m.durationMs)}</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3 w-3" />
                            <span>Image</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <span className="mr-auto self-center text-xs text-muted-foreground">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !selected.size}
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
