import { useMemo, useState } from "react";
import { Plus, Folder, Trash2, ChevronLeft, Search as SearchIcon, Send, ListOrdered, X } from "lucide-react";
import { useBibleCollections, type Collection } from "@/stores/bible-collections.store";
import { useBibleQueue } from "@/stores/bible-queue.store";
import { projectVerseAt } from "@/lib/bible/project-ref";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CollectionsPanel() {
  const { collections, create, remove } = useBibleCollections();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const active = activeId ? collections.find((c) => c.id === activeId) ?? null : null;

  if (active) return <CollectionDetail collection={active} onBack={() => setActiveId(null)} />;

  const handleCreate = () => {
    const n = newName.trim();
    if (!n) return;
    create(n);
    setNewName("");
    toast.success(`Created "${n}"`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          placeholder="New collection name…"
          className="h-7 text-xs"
        />
        <button
          onClick={handleCreate}
          className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2 text-[11px] font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!collections.length && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No collections yet.
          </div>
        )}
        <ul className="grid grid-cols-1 gap-1.5 @md:grid-cols-2">
          {collections.map((c) => (
            <li
              key={c.id}
              className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 hover:border-primary/40 hover:bg-accent/30"
            >
              <Folder className="h-3.5 w-3.5 text-primary" />
              <button
                onClick={() => setActiveId(c.id)}
                className="flex min-w-0 flex-1 flex-col items-start text-left"
              >
                <div className="truncate text-[12px] font-semibold text-foreground">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {c.verses.length} verse{c.verses.length === 1 ? "" : "s"}
                </div>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete collection "${c.name}"?`)) remove(c.id);
                }}
                className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CollectionDetail({ collection, onBack }: { collection: Collection; onBack: () => void }) {
  const removeVerse = useBibleCollections((s) => s.removeVerse);
  const enqueue = useBibleQueue((s) => s.enqueue);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return collection.verses;
    return collection.verses.filter(
      (v) => v.ref.toLowerCase().includes(t) || v.text.toLowerCase().includes(t),
    );
  }, [q, collection.verses]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <button
          onClick={onBack}
          className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
          title="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 truncate text-[12px] font-semibold">{collection.name}</div>
        <span className="text-[10px] text-muted-foreground">· {collection.verses.length}</span>
      </div>
      <div className="border-b border-border px-2 py-1.5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search this collection…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!filtered.length && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {collection.verses.length === 0 ? "No verses saved yet." : "No matches."}
          </div>
        )}
        <ul className="flex flex-col gap-1">
          {filtered.map((v) => (
            <li
              key={v.id}
              className="group flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 hover:border-primary/40 hover:bg-accent/30"
            >
              <button
                onClick={() => {
                  if (projectVerseAt(v)) toast.success(`Projecting ${v.ref}`);
                }}
                className="flex min-w-0 flex-1 flex-col items-start text-left"
              >
                <div className="text-[11px] font-semibold text-primary">{v.ref}</div>
                <div className="line-clamp-2 text-[11px] text-muted-foreground">{v.text}</div>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => {
                    enqueue(v);
                    toast.success("Added to queue");
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Add to queue"
                >
                  <ListOrdered className="h-3 w-3" />
                </button>
                <button
                  onClick={() => {
                    if (projectVerseAt(v)) toast.success(`Projecting ${v.ref}`);
                  }}
                  className="rounded p-1 text-primary hover:bg-primary/10"
                  title="Project"
                >
                  <Send className="h-3 w-3" />
                </button>
                <button
                  onClick={() => removeVerse(collection.id, v.id)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
