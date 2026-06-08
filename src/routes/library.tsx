import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LibraryPage } from "@/features/library/LibraryPage";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Media Library — Church Media" },
      { name: "description", content: "Manage images, posters, and videos for projection." },
    ],
  }),
  component: () => (
    <AppShell>
      <LibraryPage />
    </AppShell>
  ),
});
