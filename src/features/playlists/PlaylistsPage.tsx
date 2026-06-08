import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, ListVideo, Copy, Trash2, Pencil, Play } from "lucide-react";
import { createPlaylist, deletePlaylist, duplicatePlaylist, listPlaylists, renamePlaylist } from "@/db/repo";
import type { PlaylistRecord } from "@/db/schema";
import { useProjection } from "@/stores/projection.store";
import { toast } from "sonner";

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const { send, openProjector, projectorOpen } = useProjection();

  const refresh = async () => setPlaylists(await listPlaylists());

  useEffect(() => {
    void refresh();
  }, []);

  const onCreate = async () => {
    const name = prompt("Playlist name");
    if (!name) return;
    await createPlaylist(name);
    await refresh();
  };

  const projectPlaylist = (p: PlaylistRecord) => {
    if (!p.items.length) return toast.error("Playlist is empty");
    if (!projectorOpen) openProjector();
    setTimeout(() => send({ type: "LOAD_PLAYLIST", playlistId: p.id, startIndex: 0 }), projectorOpen ? 0 : 400);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Playlists</h1>
            <p className="text-sm text-muted-foreground">Organize media into ordered sequences for services.</p>
          </div>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Playlist
          </button>
        </div>

        {playlists.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <ListVideo className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-foreground">No playlists yet</p>
            <p className="text-xs text-muted-foreground">Create one to group media for a service.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((p) => (
              <div key={p.id} className="group rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                <Link to="/playlists/$id" params={{ id: p.id }} className="block">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.items.length} items</div>
                    </div>
                    <ListVideo className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
                <div className="mt-3 flex items-center gap-1">
                  <button
                    onClick={() => projectPlaylist(p)}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    <Play className="h-3 w-3" /> Project
                  </button>
                  <button
                    onClick={async () => {
                      const name = prompt("Rename", p.name);
                      if (name) {
                        await renamePlaylist(p.id, name);
                        await refresh();
                      }
                    }}
                    className="rounded-md border border-border bg-background p-1.5 hover:bg-accent"
                    aria-label="Rename"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={async () => {
                      await duplicatePlaylist(p.id);
                      await refresh();
                    }}
                    className="rounded-md border border-border bg-background p-1.5 hover:bg-accent"
                    aria-label="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete playlist "${p.name}"?`)) {
                        await deletePlaylist(p.id);
                        await refresh();
                      }
                    }}
                    className="ml-auto rounded-md border border-destructive/40 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
