import { useCallback, useEffect, useState } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Square, Volume2, VolumeX,
  MonitorPlay, MonitorOff, Eye, EyeOff, Monitor, RefreshCw, AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import { useProjection, type OpenProjectorResult } from "@/stores/projection.store";
import { getMedia } from "@/db/repo";
import type { MediaRecord } from "@/db/schema";
import { Thumb } from "@/components/Thumb";
import {
  getDisplayDiagnostics,
  requestScreenDetails,
  type DisplayDiagnostics,
  type ScreenInfo,
} from "@/lib/display/screen-manager";
import { logger } from "@/lib/logger";

const PREFERRED_SCREEN_KEY = "projector.preferredScreenId";

export function ProjectionControl() {
  const { state, projectorOpen, openProjector, closeProjector, send, init } = useProjection();
  const [currentMedia, setCurrentMedia] = useState<MediaRecord | null>(null);
  const [diag, setDiag] = useState<DisplayDiagnostics | null>(null);
  const [preferredId, setPreferredId] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(PREFERRED_SCREEN_KEY) : null,
  );
  const [launchMsg, setLaunchMsg] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const [testInfo, setTestInfo] = useState<string | null>(null);

  useEffect(() => {
    init();
    send({ type: "PING" });
  }, [init, send]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!state?.currentMediaId) { setCurrentMedia(null); return; }
      const m = await getMedia(state.currentMediaId);
      if (!cancelled) setCurrentMedia(m ?? null);
    })();
    return () => { cancelled = true; };
  }, [state?.currentMediaId]);

  const refreshDiagnostics = useCallback(async (prompt = false) => {
    if (prompt) await requestScreenDetails();
    const d = await getDisplayDiagnostics();
    setDiag(d);
    return d;
  }, []);

  useEffect(() => { void refreshDiagnostics(false); }, [refreshDiagnostics]);

  const handleSetPreferred = (id: string | null) => {
    setPreferredId(id);
    if (typeof localStorage !== "undefined") {
      if (id) localStorage.setItem(PREFERRED_SCREEN_KEY, id);
      else localStorage.removeItem(PREFERRED_SCREEN_KEY);
    }
  };

  const handleOpen = async () => {
    setLaunchMsg(null);
    const res: OpenProjectorResult = await openProjector(preferredId);
    await refreshDiagnostics(false);
    if (!res.ok) {
      setLaunchMsg({ kind: "error", text: res.message ?? `Failed to open (${res.reason})` });
      return;
    }
    if (res.screen?.isPrimary && diag && diag.screenCount === 1) {
      setLaunchMsg({
        kind: "warn",
        text: "Projector opened on the primary display — no secondary display detected. If a TV is connected via HDMI, switch Windows to Extend mode (Win+P → Extend).",
      });
    } else {
      setLaunchMsg({
        kind: "ok",
        text: `Projector opened on ${res.screen?.label ?? "the default display"} (${res.screen?.availWidth ?? "?"}×${res.screen?.availHeight ?? "?"}).`,
      });
    }
  };

  const handleTestProjector = async () => {
    setTestInfo(null);
    const d = await refreshDiagnostics(true);
    const target = d.all.find((s) => s.id === preferredId) ?? d.secondaries[0] ?? d.primary;
    if (!target) { setTestInfo("No displays detected."); return; }
    const features = [
      "popup=yes",
      `left=${target.availLeft}`,
      `top=${target.availTop}`,
      `width=${target.availWidth}`,
      `height=${target.availHeight}`,
    ].join(",");
    const win = window.open("about:blank", "projector-test", features);
    if (!win) { setTestInfo("Popup blocked — allow popups for this site."); return; }
    const html = `<!doctype html><html><head><title>Projector Test</title>
<style>html,body{margin:0;height:100%;background:#000;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;text-align:center}
.box{padding:32px;border:2px solid #4ade80;border-radius:16px;max-width:80vw}
h1{font-size:48px;margin:0 0 12px}p{margin:6px 0;opacity:.85}small{opacity:.6}</style></head>
<body><div class="box">
<h1>✓ Projector Test</h1>
<p>Target: <b>${target.label}</b></p>
<p>Resolution: ${target.width}×${target.height}</p>
<p>Position: ${target.left}, ${target.top}</p>
<p>${target.isPrimary ? "⚠ This is the PRIMARY display." : "✓ External / secondary display."}</p>
<small>Close this window when done.</small>
</div></body></html>`;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { try { win.moveTo(target.availLeft, target.availTop); win.resizeTo(target.availWidth, target.availHeight); } catch { /* */ } }, 200);
    logger.info("Test projector launched", { target: target.label, isPrimary: target.isPrimary });
    setTestInfo(`Test window opened on ${target.label}. ${target.isPrimary ? "Note: this is the primary display." : "If you don't see it on your TV/projector, your OS may still be in Duplicate mode."}`);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Projection Control</h1>
          <p className="text-sm text-muted-foreground">Live control room for the projector window.</p>
        </div>

        {/* Projector connect */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${projectorOpen ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              <div>
                <div className="font-medium">Projector window</div>
                <div className="text-xs text-muted-foreground">
                  {projectorOpen ? "Connected" : "Not open"}
                </div>
              </div>
            </div>
            <button
              onClick={projectorOpen ? closeProjector : handleOpen}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                projectorOpen ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
              } hover:opacity-90`}
            >
              {projectorOpen ? <><MonitorOff className="h-4 w-4" /> Close</> : <><MonitorPlay className="h-4 w-4" /> Open Projector</>}
            </button>
          </div>
          {launchMsg && (
            <div className={`mt-3 flex items-start gap-2 rounded-md p-2 text-xs ${
              launchMsg.kind === "error" ? "bg-destructive/10 text-destructive" :
              launchMsg.kind === "warn" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" :
              "bg-green-500/10 text-green-700 dark:text-green-400"
            }`}>
              {launchMsg.kind === "ok" ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
              <span>{launchMsg.text}</span>
            </div>
          )}
        </div>

        {/* Display Diagnostics */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Display Diagnostics</div>
            <div className="flex gap-2">
              <button
                onClick={() => refreshDiagnostics(true)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
              >
                <RefreshCw className="h-3 w-3" /> Detect Displays
              </button>
              <button
                onClick={handleTestProjector}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
              >
                <Monitor className="h-3 w-3" /> Test Projector
              </button>
            </div>
          </div>

          {diag ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatusRow label="Browser support" value={diag.supported ? "Yes (Window Management API)" : "No"} ok={diag.supported} />
                <StatusRow label="Permission" value={diag.permission} ok={diag.permission === "granted"} />
                <StatusRow label="Displays detected" value={String(diag.screenCount)} ok={diag.screenCount > 1} />
                <StatusRow label="Secondary displays" value={String(diag.secondaries.length)} ok={diag.secondaries.length > 0} />
              </div>

              {diag.all.length > 0 && (
                <div className="space-y-2">
                  {diag.all.map((s) => (
                    <ScreenCard
                      key={s.id}
                      screen={s}
                      selected={preferredId === s.id}
                      onSelect={() => handleSetPreferred(preferredId === s.id ? null : s.id)}
                    />
                  ))}
                </div>
              )}

              {diag.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{w}</span>
                </div>
              ))}
              {testInfo && (
                <div className="flex items-start gap-2 rounded-md bg-accent/40 p-2 text-xs">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" /> <span>{testInfo}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Loading…</div>
          )}
        </div>

        {/* Troubleshooting */}
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Troubleshooting</summary>
          <div className="mt-3 space-y-3 text-xs text-muted-foreground">
            <Trouble title="Projector opens on the wrong screen (mirrors laptop)">
              Windows is in <b>Duplicate</b> mode. Press <kbd className="rounded bg-muted px-1">Win</kbd>+<kbd className="rounded bg-muted px-1">P</kbd> and choose <b>Extend</b>. macOS: System Settings → Displays → arrange as Extended, uncheck "Mirror".
            </Trouble>
            <Trouble title="Only one display detected">
              Confirm the HDMI cable is seated, then click <b>Detect Displays</b>. If the OS shows two screens but the browser shows one, ensure Extend mode is active and the screen is "on, extending".
            </Trouble>
            <Trouble title="Permission denied">
              Click <b>Detect Displays</b> and accept the browser prompt. If denied previously: click the padlock icon in the address bar → Site settings → reset "Window Management" to Ask.
            </Trouble>
            <Trouble title="Browser unsupported">
              Use Chrome, Edge, or Opera (v100+). Safari and Firefox cannot place windows across multiple screens — open the projector window on your primary display and drag it to the TV manually.
            </Trouble>
            <Trouble title="Popup blocked">
              Allow popups for this site (address bar → popup icon → Always allow), then click <b>Open Projector</b> again.
            </Trouble>
            <Trouble title="Projector window won't open at all">
              Disable any popup-blocker extensions, check the browser console for errors, and try the <b>Test Projector</b> button to isolate display vs popup issues.
            </Trouble>
          </div>
        </details>

        {/* Now Showing */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium text-muted-foreground">Now Showing</div>
          {currentMedia ? (
            <div className="flex items-center gap-4">
              <Thumb media={currentMedia} className="h-24 w-40 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">{currentMedia.name}</div>
                <div className="text-xs text-muted-foreground">
                  {currentMedia.type === "video" ? "Video" : "Image"}
                  {state && state.total > 1 && ` · Item ${state.index + 1} of ${state.total}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">Nothing projecting</div>
          )}
        </div>

        {/* Transport */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium text-muted-foreground">Transport</div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => send({ type: "PREV" })} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent">
              <SkipBack className="h-4 w-4" />
            </button>
            {state?.playing ? (
              <button onClick={() => send({ type: "PAUSE" })} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Pause className="h-4 w-4" /> Pause
              </button>
            ) : (
              <button onClick={() => send({ type: "PLAY" })} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Play className="h-4 w-4" /> Play
              </button>
            )}
            <button onClick={() => send({ type: "NEXT" })} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent">
              <SkipForward className="h-4 w-4" />
            </button>
            <button onClick={() => send({ type: "STOP" })} className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm hover:bg-accent">
              <Square className="h-4 w-4" /> Stop
            </button>
            <div className="mx-2 h-6 w-px bg-border" />
            <button
              onClick={() => send({ type: "BLACK", value: !state?.black })}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm ${
                state?.black ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
              } hover:bg-accent`}
            >
              {state?.black ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {state?.black ? "Show" : "Black Screen"}
            </button>
            <div className="mx-2 h-6 w-px bg-border" />
            <button
              onClick={() => send({ type: "MUTE", value: !state?.muted })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent"
            >
              {state?.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.01}
              value={state?.volume ?? 0.8}
              onChange={(e) => send({ type: "VOLUME", value: Number(e.target.value) })}
              className="w-32 accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded border border-border bg-background px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${ok ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>{value}</span>
    </div>
  );
}

function ScreenCard({ screen, selected, onSelect }: { screen: ScreenInfo; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-accent"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          <span className="font-medium text-sm">{screen.label}</span>
          {screen.isPrimary && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">Primary</span>}
          {!screen.isInternal && <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] uppercase text-green-700 dark:text-green-400">External</span>}
          {selected && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] uppercase text-primary-foreground">Preferred</span>}
        </div>
        <div className="text-xs text-muted-foreground">{screen.width}×{screen.height} @ {screen.devicePixelRatio}x</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Position {screen.left},{screen.top} · Available {screen.availWidth}×{screen.availHeight}
      </div>
    </button>
  );
}

function Trouble({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="mb-1 text-xs font-medium text-foreground">{title}</div>
      <div>{children}</div>
    </div>
  );
}
