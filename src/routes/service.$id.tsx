import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ServiceMode } from "@/features/service/ServiceMode";

export const Route = createFileRoute("/service/$id")({
  head: () => ({ meta: [{ title: "Service Mode — Church Media" }] }),
  component: ServiceModeRoute,
});

function ServiceModeRoute() {
  const { id } = Route.useParams();
  return (
    <AppShell>
      <ServiceMode id={id} />
    </AppShell>
  );
}
