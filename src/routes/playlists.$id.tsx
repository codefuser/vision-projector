import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlaylistEditor } from "@/features/playlists/PlaylistEditor";

export const Route = createFileRoute("/playlists/$id")({
  head: () => ({ meta: [{ title: "Edit Playlist — Church Media" }] }),
  component: PlaylistEditorRoute,
});

function PlaylistEditorRoute() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <PlaylistEditor id={id} />
    </AppShell>
  );
}
