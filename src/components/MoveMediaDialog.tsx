import { useEffect, useState } from "react";
import { Folder, FolderOpen, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FolderRecord } from "@/db/schema";
import { cn } from "@/lib/utils";

interface MoveMediaDialogProps {
  open: boolean;
  count: number;
  folders: FolderRecord[];
  /** Current folder so the dialog can highlight or skip it. */
  currentFolderId: string | null;
  onCancel: () => void;
  onConfirm: (folderId: string | null) => void | Promise<void>;
}

/**
 * Windows Explorer-style folder picker. Lists every folder + an "All Media"
 * (root) option. Selection is visual — no typing required.
 */
export function MoveMediaDialog({ open, count, folders, currentFolderId, onCancel, onConfirm }: MoveMediaDialogProps) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget(currentFolderId);
      setBusy(false);
    }
  }, [open, currentFolderId]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm(target);
    } finally {
      setBusy(false);
    }
  };

  const sorted = [...folders].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {count} {count === 1 ? "file" : "files"}</DialogTitle>
          <DialogDescription>Select a destination folder.</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/20 p-1">
          <FolderRow
            label="All Media (root)"
            icon={<FolderOpen className="h-4 w-4" />}
            selected={target === null}
            current={currentFolderId === null}
            onClick={() => setTarget(null)}
          />
          {sorted.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No folders. Create one in the folder rail first.
            </div>
          ) : (
            sorted.map((f) => (
              <FolderRow
                key={f.id}
                label={f.name}
                icon={<Folder className="h-4 w-4" />}
                selected={target === f.id}
                current={currentFolderId === f.id}
                onClick={() => setTarget(f.id)}
              />
            ))
          )}
        </div>

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
            type="button"
            onClick={handleConfirm}
            disabled={busy || target === currentFolderId}
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Moving…" : "Move"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderRow({
  label,
  icon,
  selected,
  current,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition",
        selected ? "bg-primary/15 text-foreground" : "hover:bg-accent",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {current && (
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Current
        </span>
      )}
      {selected && <Check className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}
