import { useState, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { importFiles, type ImportProgress } from "@/db/repo";
import { toast } from "sonner";

interface Props {
  folderId: string | null;
  onDone?: () => void;
  className?: string;
}

export function Dropzone({ folderId, onDone, className }: Props) {
  const [hover, setHover] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const onFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setProgress({ done: 0, total: arr.length });
    try {
      const { imported, skipped } = await importFiles(arr, folderId, (p) => setProgress(p));
      if (imported.length) toast.success(`Imported ${imported.length} file${imported.length > 1 ? "s" : ""}`);
      if (skipped.length) toast.error(`Skipped ${skipped.length} file${skipped.length > 1 ? "s" : ""}`);
      onDone?.();
    } catch (e) {
      toast.error("Import failed: " + (e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setHover(false);
    if (e.dataTransfer?.files) void onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      className={`relative rounded-lg border-2 border-dashed p-6 text-center transition ${
        hover ? "border-primary bg-primary/5" : "border-border"
      } ${className ?? ""}`}
    >
      <input
        id="file-input"
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-foreground">Drag & drop images, posters, or videos here</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Images</span>
        {["JPG", "JPEG", "PNG", "WEBP", "GIF"].map((f) => (
          <span key={f} className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
            {f}
          </span>
        ))}
        <span className="mx-1 text-muted-foreground/40">·</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Videos</span>
        {["MP4", "WEBM", "MOV"].map((f) => (
          <span key={f} className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
            {f}
          </span>
        ))}
      </div>
      <label
        htmlFor="file-input"
        className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Choose Files
      </label>
      {progress && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/95">
          <div className="text-sm font-medium">
            Importing {progress.done}/{progress.total}
          </div>
          {progress.current && <div className="max-w-[80%] truncate text-xs text-muted-foreground">{progress.current}</div>}
          <div className="h-2 w-3/4 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
