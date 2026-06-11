import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProjectionWorkspace } from "@/features/workspace/ProjectionWorkspace";
import { ProjectionWindow } from "@/features/projection/ProjectionWindow";

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
  // Compute mode synchronously to avoid the "loading" black-flash on every nav.
  const [mode] = useState<"popup" | "control">(() => {
    if (typeof window === "undefined") return "control";
    return window.opener && window.name === "church-projector" ? "popup" : "control";
  });
  if (mode === "popup") return <ProjectionWindow />;
  return (
    <AppShell>
      <ProjectionWorkspace />
    </AppShell>
  );
}


