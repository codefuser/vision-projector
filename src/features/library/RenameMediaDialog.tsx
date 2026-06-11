import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RenameMediaDialogProps {
  open: boolean;
  initialName: string;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}

/**
 * Modal rename dialog used by the library media grid.
 * - Enter submits, Escape cancels (handled by Radix Dialog).
 * - Empty / whitespace-only names are rejected client-side.
 */
export function RenameMediaDialog({ open, initialName, onCancel, onSubmit }: RenameMediaDialogProps) {
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialName);
      setError(null);
      // Defer focus to next tick so dialog content has mounted.
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
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="File name"
            aria-invalid={!!error}
          />
          {error && <div className="text-xs text-destructive">{error}</div>}
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
