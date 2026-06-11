// Thin shim kept for backward compatibility with existing imports.
// All rename modals (media, folder, playlist) now share RenameDialog.
import { RenameDialog } from "@/components/RenameDialog";

interface RenameMediaDialogProps {
  open: boolean;
  initialName: string;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
}

export function RenameMediaDialog(props: RenameMediaDialogProps) {
  return <RenameDialog {...props} title="File" />;
}
