import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ProjectionControl } from "@/features/projection/ProjectionControl";

export const Route = createFileRoute("/project")({
  head: () => ({
    meta: [
      { title: "Project — Church Media" },
      { name: "description", content: "Live projection control room." },
    ],
  }),
  component: ProjectRoute,
});

function ProjectRoute() {
  // When opened in popup, render the bare projection window (no AppShell).
  if (typeof window !== "undefined" && window.opener && window.name === "church-projector") {
    return <ProjectionWindowLazy />;
  }
  return (
    <AppShell>
      <ProjectionControl />
    </AppShell>
  );
}

import { ProjectionWindow } from "@/features/projection/ProjectionWindow";
function ProjectionWindowLazy() {
  return <ProjectionWindow />;
}
