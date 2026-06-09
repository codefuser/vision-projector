import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState<"loading" | "popup" | "control">("loading");
  useEffect(() => {
    const isPopup = typeof window !== "undefined" && window.opener && window.name === "church-projector";
    setMode(isPopup ? "popup" : "control");
  }, []);
  if (mode === "loading") return <div className="h-screen bg-black" />;
  if (mode === "popup") return <ProjectionWindow />;
  return (
    <AppShell>
      <ProjectionWorkspace />
    </AppShell>
  );
}

