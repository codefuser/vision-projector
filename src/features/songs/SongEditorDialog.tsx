/**
 * Create / edit a user song. Lyrics are pasted as plain text — one blank
 * line separates slides. The slide preview updates live so the operator
 * sees exactly what will be generated before saving.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { buildSlides } from "@/lib/songs/loader";
import { useSongsStore } from "@/lib/songs/store";
import { getSongs } from "@/lib/songs/loader";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingId?: number | null;
}

export function SongEditorDialog({ open, onOpenChange, editingId }: Props) {
  const userSongs = useSongsStore((s) => s.userSongs);
  const addUserSong = useSongsStore((s) => s.addUserSong);
  const upsertUserSong = useSongsStore((s) => s.upsertUserSong);
  const selectSong = useSongsStore((s) => s.selectSong);

  // Resolve the editing song from user songs first, fall back to library.
  const editing = useMemo(() => {
    if (!editingId) return null;
    const u = userSongs.find((x) => x.id === editingId);
    if (u) return { ...u, isUser: true };
    const lib = getSongs()?.find((s) => s.id === editingId);
    if (lib) return {
      id: lib.id, title: lib.title, content: lib.content,
      artist: lib.artist, album: lib.album, scale: lib.scale, isUser: false,
    };
    return null;
  }, [editingId, userSongs, open]);

  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [artist, setArtist] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setLyrics(editing?.content ?? "");
    setArtist(editing?.artist ?? "");
  }, [open, editing]);

  const slides = useMemo(() => buildSlides(lyrics), [lyrics]);

  const save = () => {
    const t = title.trim();
    const c = lyrics.trim();
    if (!t) { toast.error("Title is required"); return; }
    if (!c) { toast.error("Lyrics are required"); return; }
    if (editing) {
      upsertUserSong({
        id: editing.id, title: t, content: c, artist: artist.trim(),
        album: editing.album, scale: editing.scale,
      });
      toast.success(editing.isUser ? "Song updated" : "Library song overridden");
    } else {
      const id = addUserSong({ title: t, content: c, artist: artist.trim() });
      selectSong(id);
      toast.success("Song created");
    }
    onOpenChange(false);
  };

  // Stop ALL keystrokes inside the editor from bubbling to global shortcut
  // handlers (Enter, Arrow keys, "/" etc.). The dialog must behave like a
  // plain text editor — no projection / navigation side-effects.
  const swallowKeys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return; // let Radix close the dialog
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl" onKeyDown={swallowKeys} onKeyDownCapture={swallowKeys}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Song" : "New Song"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Title (தமிழ்)</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="பாடல் தலைப்பு" autoFocus />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Artist (optional)</label>
              <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="இசையமைப்பாளர் / பாடகர்" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">
                Lyrics — one blank line = new slide
              </label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={16}
                placeholder={"இயேசு என் இரட்சகர்\nஇயேசு என் ஆண்டவர்\n\n(chorus)\nஅல்லேலூயா அல்லேலூயா"}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Slide preview · {slides.length} slide{slides.length === 1 ? "" : "s"}
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
              {slides.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Paste lyrics to generate slides.
                </div>
              )}
              {slides.map((s, i) => (
                <div key={i} className="rounded border border-border bg-card p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Slide {i + 1}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug">{s}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save changes" : "Create song"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
