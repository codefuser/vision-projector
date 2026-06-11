import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type FolderDeleteMode = "folder-only" | "folder-and-files";

interface FolderDeleteDialogProps {
  open: boolean;
  folderName: string;
  onCancel: () => void;
  onConfirm: (mode: FolderDeleteMode) => void | Promise<void>;
}

export function FolderDeleteDialog({ open, folderName, onCancel, onConfirm }: FolderDeleteDialogProps) {
  const [mode, setMode] = useState<FolderDeleteMode>("folder-only");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("folder-only");
      setBusy(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm(mode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Folder</DialogTitle>
          <DialogDescription>
            "{folderName}" — choose what to delete.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/40">
            <input
              type="radio"
              name="folder-delete-mode"
              checked={mode === "folder-only"}
              onChange={() => setMode("folder-only")}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Delete Folder Only</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Folder removed. Files remain and automatically move to All Media.
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/40">
            <input
              type="radio"
              name="folder-delete-mode"
              checked={mode === "folder-and-files"}
              onChange={() => setMode("folder-and-files")}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-destructive"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive">Delete Folder And Files</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Folder removed. All files inside are permanently deleted.
              </div>
            </div>
          </label>
        </div>

        <DialogFooter>
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
