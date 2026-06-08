import { Link, useRouterState } from "@tanstack/react-router";
import { FolderTree, ListVideo, MonitorPlay, Settings as SettingsIcon, Moon, Sun, Monitor } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useSettings } from "@/stores/settings.store";
import { useProjection } from "@/stores/projection.store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/library", label: "Library", icon: FolderTree },
  { to: "/playlists", label: "Playlists", icon: ListVideo },
  { to: "/project", label: "Project", icon: MonitorPlay },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings, update, load, loaded } = useSettings();
  const { projectorOpen, openProjector, closeProjector, init } = useProjection();

  useEffect(() => {
    init();
    if (!loaded) void load();
  }, [init, load, loaded]);

  const cycleTheme = () => {
    const order: Array<typeof settings.theme> = ["light", "dark", "system"];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    void update({ theme: next });
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MonitorPlay className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">Church Media</div>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-2 text-xs text-muted-foreground">
          Offline-first · Local only
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4">
          <div className="text-sm font-medium capitalize text-muted-foreground">
            {pathname.split("/").filter(Boolean)[0] ?? "Library"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={projectorOpen ? closeProjector : openProjector}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition",
                projectorOpen
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90",
              )}
            >
              <MonitorPlay className="h-4 w-4" />
              {projectorOpen ? "Close Projector" : "Open Projector"}
            </button>
            <button
              onClick={cycleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
              aria-label="Toggle theme"
              title={`Theme: ${settings.theme}`}
            >
              {settings.theme === "dark" ? <Moon className="h-4 w-4" /> : settings.theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
