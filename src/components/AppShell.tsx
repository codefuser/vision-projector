import { Link, useRouterState } from "@tanstack/react-router";
import { FolderTree, ListVideo, MonitorPlay, Settings as SettingsIcon, Moon, Sun, Monitor, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useSettings } from "@/stores/settings.store";
import { useProjection } from "@/stores/projection.store";
import { projectionEngine } from "@/projection";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { to: "/library", label: "Library", icon: FolderTree },
  { to: "/playlists", label: "Playlists", icon: ListVideo },
  { to: "/project", label: "Project", icon: MonitorPlay },
] as const;

const SETTINGS_NAV = { to: "/settings", label: "Settings", icon: SettingsIcon } as const;

const SIDEBAR_KEY = "church-media-sidebar-collapsed-v1";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings, update, load, loaded } = useSettings();
  const { projectorOpen, openProjector, closeProjector, init } = useProjection();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  });

  useEffect(() => {
    init();
    projectionEngine.bootstrap();
    if (!loaded) void load();
  }, [init, load, loaded]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const cycleTheme = () => {
    const order: Array<typeof settings.theme> = ["light", "dark", "system"];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    void update({ theme: next });
  };

  const renderNavItem = (item: { to: string; label: string; icon: typeof FolderTree }) => {
    const active = pathname === item.to || pathname.startsWith(item.to + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md text-sm transition-colors duration-150",
          collapsed ? "justify-center px-0 py-2" : "px-3 py-2",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span
          className={cn(
            "truncate transition-[opacity,width] duration-200",
            collapsed ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100",
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Header with brand + top-mounted collapse toggle */}
        <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-3")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MonitorPlay className="h-4 w-4" />
          </div>
          {!collapsed && <div className="flex-1 truncate text-sm font-semibold">Church Media</div>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              collapsed && "hidden",
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="mx-2 mt-2 inline-flex h-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Primary nav */}
        <nav className="flex-1 space-y-1 p-2">
          {PRIMARY_NAV.map(renderNavItem)}
        </nav>

        {/* Pinned bottom: Settings */}
        <div className="border-t border-sidebar-border p-2">
          {renderNavItem(SETTINGS_NAV)}
          {!collapsed && (
            <div className="px-2 pt-2 text-[10px] text-muted-foreground">Offline-first · Local only</div>
          )}
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
