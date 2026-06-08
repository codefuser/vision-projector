import { useEffect, useState } from "react";
import { Download, Upload as UploadIcon, Trash2 } from "lucide-react";
import { useSettings } from "@/stores/settings.store";
import { DEFAULT_SETTINGS, type AppSettings, type TransitionType, type LoopMode, type ThemeMode } from "@/db/schema";
import { exportBackup, importBackup } from "@/features/backup/backup";
import { toast } from "sonner";
import { db } from "@/db/schema";

const THEMES: ThemeMode[] = ["light", "dark", "system"];
const TRANSITIONS: TransitionType[] = ["fade", "crossfade", "zoom", "dissolve", "none"];
const LOOPS: LoopMode[] = ["none", "single", "playlist"];

export function SettingsPage() {
  const { settings, update, load, loaded } = useSettings();
  const [busy, setBusy] = useState<string | null>(null);
  const [stats, setStats] = useState<{ media: number; folders: number; playlists: number; blobsMB: number } | null>(null);

  useEffect(() => {
    if (!loaded) void load();
  }, [load, loaded]);

  useEffect(() => {
    (async () => {
      const [media, folders, playlists, blobs] = await Promise.all([
        db().media.count(),
        db().folders.count(),
        db().playlists.count(),
        db().blobs.toArray(),
      ]);
      const totalBytes = blobs.reduce((sum, b) => sum + (b.blob.size ?? 0), 0);
      setStats({ media, folders, playlists, blobsMB: totalBytes / (1024 * 1024) });
    })();
  }, []);

  const set = (patch: Partial<AppSettings>) => update(patch);

  const onExport = async () => {
    setBusy("export");
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `church-media-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (e) {
      toast.error("Export failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onImport = async (file: File) => {
    const replace = confirm("Replace existing library? Click Cancel to merge.");
    setBusy("import");
    try {
      await importBackup(file, { mode: replace ? "replace" : "merge" });
      toast.success("Backup restored — reloading…");
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      toast.error("Import failed: " + (e as Error).message);
      setBusy(null);
    }
  };

  const wipeAll = async () => {
    if (!confirm("Delete ALL local data? This cannot be undone.")) return;
    await db().delete();
    window.location.reload();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">All data stored locally on this device.</p>
        </div>

        <Section title="General">
          <Field label="Theme">
            <select value={settings.theme} onChange={(e) => set({ theme: e.target.value as ThemeMode })} className="select">
              {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Language">
            <select value={settings.language} onChange={(e) => set({ language: e.target.value })} className="select">
              <option value="en">English</option>
            </select>
          </Field>
        </Section>

        <Section title="Projection Defaults">
          <Field label="Default image duration (seconds)">
            <input
              type="number" min={1} max={3600}
              value={Math.round(settings.defaultImageDurationMs / 1000)}
              onChange={(e) => set({ defaultImageDurationMs: Math.max(1, Number(e.target.value)) * 1000 })}
              className="input w-28"
            />
          </Field>
          <Field label="Default transition">
            <select value={settings.defaultTransition} onChange={(e) => set({ defaultTransition: e.target.value as TransitionType })} className="select">
              {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Default loop mode">
            <select value={settings.defaultLoopMode} onChange={(e) => set({ defaultLoopMode: e.target.value as LoopMode })} className="select">
              {LOOPS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="Video Defaults">
          <Field label="Default volume">
            <input
              type="range" min={0} max={1} step={0.05}
              value={settings.defaultVolume}
              onChange={(e) => set({ defaultVolume: Number(e.target.value) })}
              className="w-48 accent-primary"
            />
            <span className="ml-2 text-sm text-muted-foreground">{Math.round(settings.defaultVolume * 100)}%</span>
          </Field>
          <Field label="Autoplay videos">
            <input type="checkbox" checked={settings.autoplayVideo} onChange={(e) => set({ autoplayVideo: e.target.checked })} className="h-4 w-4 accent-primary" />
          </Field>
          <Field label="Mute on start">
            <input type="checkbox" checked={settings.muteOnStart} onChange={(e) => set({ muteOnStart: e.target.checked })} className="h-4 w-4 accent-primary" />
          </Field>
        </Section>

        <Section title="Backup & Restore">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExport}
              disabled={busy === "export"}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Download className="h-4 w-4" /> {busy === "export" ? "Exporting…" : "Export Backup"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              <UploadIcon className="h-4 w-4" /> {busy === "import" ? "Importing…" : "Import Backup"}
              <input
                type="file" accept=".zip,application/zip" hidden
                onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Backup includes all folders, media, playlists, and settings.
          </p>
        </Section>

        <Section title="Storage">
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Media" value={stats.media} />
              <Stat label="Folders" value={stats.folders} />
              <Stat label="Playlists" value={stats.playlists} />
              <Stat label="Used" value={`${stats.blobsMB.toFixed(1)} MB`} />
            </div>
          )}
          <button
            onClick={wipeAll}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" /> Wipe All Data
          </button>
        </Section>
      </div>

      <style>{`
        .input, .select { height: 36px; border-radius: 6px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); padding: 0 10px; font-size: 14px; }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-foreground">{label}</div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-background p-3 text-center">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

// silence unused default settings import warning
void DEFAULT_SETTINGS;
