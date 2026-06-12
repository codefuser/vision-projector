import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Keyboard, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { useRegisteredShortcuts } from "@/lib/shortcuts/use-shortcut";
import { formatCombo, type ShortcutCategory } from "@/lib/shortcuts/manager";

export const Route = createFileRoute("/shortcuts")({
  head: () => ({
    meta: [
      { title: "Keyboard Shortcuts — Church Media" },
      { name: "description", content: "Discover every keyboard shortcut available in the projection workspace." },
    ],
  }),
  component: ShortcutsPage,
});

const ORDER: { id: ShortcutCategory; label: string; hint: string }[] = [
  { id: "general", label: "General", hint: "App-wide actions" },
  { id: "navigation", label: "Navigation", hint: "Tabs and routes" },
  { id: "media", label: "Media", hint: "Library & playback" },
  { id: "bible", label: "Bible", hint: "Search & navigate" },
  { id: "songs", label: "Songs", hint: "Lyrics" },
  { id: "text", label: "Text", hint: "Free-form text" },
  { id: "projector", label: "Projection", hint: "Projector control" },
  { id: "favorites", label: "Favorites", hint: "Quick recall" },
  { id: "playlist", label: "Playlist", hint: "Playlist editor" },
  { id: "playlists", label: "Playlists", hint: "Playlist browser" },
];

function ShortcutsPage() {
  return (
    <AppShell>
      <ShortcutsBody />
    </AppShell>
  );
}

function ShortcutsBody() {
  const all = useRegisteredShortcuts();
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const matches = all.filter(
      (s) =>
        !f ||
        s.label.toLowerCase().includes(f) ||
        s.id.toLowerCase().includes(f) ||
        s.keys.some((k) => k.toLowerCase().includes(f)),
    );
    const map = new Map<ShortcutCategory, typeof all>();
    for (const s of matches) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.label.localeCompare(b.label));
    return map;
  }, [all, filter]);

  const total = all.length;
  const visible = [...grouped.values()].reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Keyboard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold tracking-tight">Shortcut Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every keyboard shortcut registered across the app. Auto-generated — new shortcuts appear here instantly.
              Showing <span className="font-medium text-foreground">{visible}</span> of {total}.
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by action, key, or category…"
            className="h-10 pl-9"
            autoFocus
          />
        </div>

        <div className="space-y-6">
          {ORDER.map((cat) => {
            const items = grouped.get(cat.id);
            if (!items || items.length === 0) return null;
            return (
              <section key={cat.id} className="rounded-lg border border-border bg-card">
                <header className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
                  <h2 className="text-sm font-semibold">{cat.label}</h2>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{cat.hint} · {items.length}</span>
                </header>
                <ul className="divide-y divide-border">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm">{s.label}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{s.id}</div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px]"
                          >
                            {formatCombo(k)}
                          </kbd>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {visible === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-card/40 py-12 text-center text-sm text-muted-foreground">
              No shortcuts match “{filter}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
