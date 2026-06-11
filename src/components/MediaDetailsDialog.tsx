import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MediaRecord, FolderRecord } from "@/db/schema";
import { formatBytes, formatDuration } from "@/lib/files";

interface MediaDetailsDialogProps {
  open: boolean;
  media: MediaRecord | null;
  folders: FolderRecord[];
  onClose: () => void;
}

/** Read-only info window for a media item. */
export function MediaDetailsDialog({ open, media, folders, onClose }: MediaDetailsDialogProps) {
  if (!media) return null;
  const folderName =
    media.folderId === null
      ? "All Media (root)"
      : folders.find((f) => f.id === media.folderId)?.name ?? "Unknown folder";

  const uploaded = new Date(media.createdAt).toLocaleString();
  const resolution = media.width && media.height ? `${media.width} × ${media.height}` : "—";

  const rows: Array<[string, string]> = media.type === "video"
    ? [
        ["Name", media.name],
        ["Type", "Video"],
        ["Size", formatBytes(media.size)],
        ["Duration", formatDuration(media.durationMs)],
        ["Resolution", resolution],
        ["Folder", folderName],
        ["Uploaded", uploaded],
      ]
    : [
        ["Name", media.name],
        ["Type", "Image"],
        ["Size", formatBytes(media.size)],
        ["Resolution", resolution],
        ["Folder", folderName],
        ["Uploaded", uploaded],
      ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Media details</DialogTitle>
        </DialogHeader>
        <dl className="divide-y divide-border rounded-md border border-border bg-muted/20 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3 px-3 py-2">
              <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="min-w-0 flex-1 break-words text-foreground" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
