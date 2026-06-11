import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaRecord, FolderRecord } from "@/db/schema";

interface MediaDeleteDialogProps {
  open: boolean;
  /** Single item view, or summary when multiple. */
  items: MediaRecord[];
  folders: FolderRecord[];
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * Professional delete confirmation modal. Matches the RenameDialog styling.
 *   - Shows file name, type, and folder location for a single item.
 *   - Shows count + sample names for multi-select.
 *   - Enter = confirm, Escape = cancel (provided by Radix Dialog + form).
 */
export function MediaDeleteDialog({ open, items, folders, onCancel, onConfirm }: MediaDeleteDialogProps) {
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setBusy(false);
      const t = setTimeout(() => confirmRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !busy) {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const folderName = (id: string | null) =>
    id === null ? "All Media" : folders.find((f) => f.id === id)?.name ?? "Unknown folder";

  const single = items.length === 1 ? items[0] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Delete {single ? "file" : `${items.length} files`}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {single ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <Row label="Name" value={single.name} mono />
            <Row label="Type" value={single.type === "video" ? "Video" : "Image"} />
            <Row label="Folder" value={folderName(single.folderId)} />
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {items.length} items
            </div>
            <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs">
              {items.slice(0, 8).map((m) => (
                <li key={m.id} className="truncate text-foreground/80">• {m.name}</li>
              ))}
              {items.length > 8 && (
                <li className="text-muted-foreground">…and {items.length - 8} more</li>
              )}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={run}
            disabled={busy}
            className="cursor-pointer rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3 py-0.5">
      <span className="w-16 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={"min-w-0 flex-1 truncate " + (mono ? "font-mono text-xs" : "text-sm")} title={value}>{value}</span>
    </div>
  );
}
