import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRegisteredShortcuts, useShortcut } from "@/lib/shortcuts/use-shortcut";
import { formatCombo, type ShortcutCategory } from "@/lib/shortcuts/manager";

const ORDER: { id: ShortcutCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "navigation", label: "Navigation" },
  { id: "media", label: "Media" },
  { id: "playlist", label: "Playlist" },
  { id: "projector", label: "Projector" },
  { id: "bible", label: "Bible" },
  { id: "songs", label: "Songs" },
  { id: "text", label: "Text" },
];

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const all = useRegisteredShortcuts();

  useShortcut({
    id: "shortcuts.help",
    label: "Show keyboard shortcuts",
    category: "general",
    keys: ["F1", "?"],
    scope: "global",
    handler: () => setOpen((o) => !o),
  });

  useEffect(() => {
    if (!open) setFilter("");
  }, [open]);

  const grouped = useMemo(() => {
    const f = filter.toLowerCase();
    const matches = all.filter(
      (s) => !f || s.label.toLowerCase().includes(f) || s.keys.some((k) => k.toLowerCase().includes(f)),
    );
    const map = new Map<ShortcutCategory, typeof all>();
    for (const s of matches) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return map;
  }, [all, filter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter shortcuts…"
            className="mt-2 h-8 text-sm"
            autoFocus
          />
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto p-4">
          {ORDER.map((cat) => {
            const items = grouped.get(cat.id);
            if (!items || !items.length) return null;
            return (
              <section key={cat.id}>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {cat.label}
                </div>
                <ul className="space-y-1">
                  {items.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-3 py-1.5 text-sm"
                    >
                      <span>{s.label}</span>
                      <span className="flex flex-wrap gap-1">
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                          >
                            {formatCombo(k)}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {[...grouped.values()].every((a) => a.length === 0) && (
            <div className="py-8 text-center text-sm text-muted-foreground">No matching shortcuts.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
