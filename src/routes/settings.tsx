import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Church Media" }] }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});
