import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FolderCreateDialogProps {
  open: boolean;
  /** Sibling folder names already at this parent level (lowercased compare). */
  siblingNames: string[];
  parentLabel?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}

/**
 * Dedicated modal for creating a folder. Validates empty and duplicate names
 * inline (no browser prompt/alert).
 */
export function FolderCreateDialog({
  open,
  siblingNames,
  parentLabel,
  onCancel,
  onSubmit,
}: FolderCreateDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      setBusy(false);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const validate = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return "Folder name cannot be empty";
    if (trimmed.length > 200) return "Folder name is too long";
    const lower = trimmed.toLowerCase();
    if (siblingNames.some((n) => n.trim().toLowerCase() === lower))
      return "A folder with this name already exists here";
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }
    try {
      setBusy(true);
      await onSubmit(value.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          {parentLabel && (
            <DialogDescription>Inside: {parentLabel}</DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-xs text-muted-foreground">Folder name</label>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Sunday Service"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Folder name"
            aria-invalid={!!error}
            disabled={busy}
          />
          {error && <div className="text-xs text-destructive">{error}</div>}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
