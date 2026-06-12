/**
 * Compact, horizontally-scrollable list of one-click presentation templates.
 * Lives at the top of the Text Formatting panel. Selecting a template
 * applies its style across Reference / Tamil / English + Background + Logo.
 */
import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check } from "lucide-react";
import { TEMPLATE_PRESETS } from "@/lib/templates/presets";
import { applyTemplate, activeTemplateId } from "@/lib/templates/apply";
import { cn } from "@/lib/utils";

export function TemplatesStrip() {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<string | null>(activeTemplateId());

  return (
    <div className="border-b border-border bg-muted/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent/40"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Templates</span>
        <span className="ml-1 rounded bg-muted px-1 text-[9px] normal-case tracking-normal">
          {TEMPLATE_PRESETS.length}
        </span>
        {active && (
          <span className="ml-2 truncate text-[10px] font-medium normal-case tracking-normal text-primary">
            {TEMPLATE_PRESETS.find((t) => t.id === active)?.name}
          </span>
        )}
        <span className="ml-auto">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2.5 pt-1">
          {TEMPLATE_PRESETS.map((t) => {
            const isActive = active === t.id;
            const bgColor = (t.background as { color?: string }).color ?? "#000000";
            const textColor = t.text.color ?? "#ffffff";
            return (
              <button
                key={t.id}
                onClick={() => { applyTemplate(t.id); setActive(t.id); }}
                title={`${t.name} — ${t.description}`}
                className={cn(
                  "group relative flex w-[110px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-md border text-left transition",
                  isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60",
                )}
              >
                <div
                  className="flex h-12 items-center justify-center"
                  style={{ background: bgColor }}
                >
                  <span
                    className="text-[18px] font-bold leading-none"
                    style={{
                      color: textColor,
                      fontFamily: t.text.fontFamily,
                      textShadow: t.text.shadow ? "0 1px 3px rgba(0,0,0,.6)" : undefined,
                    }}
                  >
                    Aa
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-card px-1.5 py-1 text-[10px] font-medium">
                  <span className="truncate">{t.name}</span>
                  {isActive && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
