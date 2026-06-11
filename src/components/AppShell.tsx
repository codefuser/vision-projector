import { Link, useRouterState } from "@tanstack/react-router";
import { FolderTree, ListVideo, MonitorPlay, Settings as SettingsIcon, Moon, Sun, Monitor, PanelLeftClose } from "lucide-react";
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

const SIDEBAR_KEY = "church-media-sidebar-collapsed-v2";

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
        title={item.label}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-300 ease-in-out",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Brand / logo header.
            • Collapsed: the whole row is a clickable logo that expands the sidebar.
            • Expanded: logo + name on the left, collapse button on the right. */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "gap-2 px-3",
          )}
        >
          <button
            type="button"
            onClick={() => collapsed && setCollapsed(false)}
            aria-label={collapsed ? "Expand sidebar" : "Church Media"}
            title={collapsed ? "Expand sidebar" : "Church Media"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-transform",
              collapsed ? "cursor-pointer hover:scale-105" : "cursor-default",
            )}
          >
            <MonitorPlay className="h-4 w-4" />
          </button>

          {!collapsed && (
            <>
              <div className="flex-1 truncate text-sm font-semibold">Church Media</div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Primary nav (hidden when collapsed — only the logo remains) */}
        {!collapsed && (
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {PRIMARY_NAV.map(renderNavItem)}
          </nav>
        )}
        {collapsed && <div className="flex-1" />}

        {/* Pinned bottom: Settings (only when expanded) */}
        {!collapsed && (
          <div className="border-t border-sidebar-border p-2">
            {renderNavItem(SETTINGS_NAV)}
            <div className="px-2 pt-2 text-[10px] text-muted-foreground">Offline-first · Local only</div>
          </div>
        )}
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
                "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition",
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
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
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
