import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RenameDialogProps {
  open: boolean;
  initialName: string;
  title?: string;
  label?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}

/**
 * Generic rename modal used by media, folders, and playlists.
 *   ┌───────────────────────┐
 *   │ Rename <title>        │
 *   │ [ name input        ] │
 *   │       Cancel  Save    │
 *   └───────────────────────┘
 */
export function RenameDialog({
  open,
  initialName,
  title = "File",
  label,
  onCancel,
  onSubmit,
}: RenameDialogProps) {
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialName);
      setError(null);
      setBusy(false);
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [open, initialName]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    if (trimmed.length > 200) {
      setError("Name is too long");
      return;
    }
    if (trimmed === initialName) {
      onCancel();
      return;
    }
    try {
      setBusy(true);
      await onSubmit(trimmed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {label && <label className="text-xs text-muted-foreground">{label}</label>}
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={`${title} name`}
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
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
