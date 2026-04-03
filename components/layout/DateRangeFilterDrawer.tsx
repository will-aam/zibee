"use client";

import * as React from "react";
import { X, Calendar, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PresetKey = "this_month" | "last_month" | "all_time" | "custom";

export type DateRangeValue = {
  from: string | null; // YYYY-MM-DD
  to: string | null; // YYYY-MM-DD
  preset: PresetKey;
};

interface DateRangeFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApplied?: (value: DateRangeValue) => void;
}

/**
 * IMPORTANTE:
 * - Estas chaves/evento precisam bater com Dashboard e Header.
 * - Dashboard e Header escutam esse evento para refazer queries.
 */
export const FILTER_EVENT = "dashboard:filter-changed";
export const STORAGE_MONTH_KEY = "dashboardFiltroMes";
export const STORAGE_FROM_KEY = "dashboardFiltroDe";
export const STORAGE_TO_KEY = "dashboardFiltroAte";
export const STORAGE_PRESET_KEY = "dashboardFiltroPreset";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthRange(year: number, month1to12: number) {
  const from = new Date(year, month1to12 - 1, 1);
  const to = new Date(year, month1to12, 0);
  return { from: toYMD(from), to: toYMD(to) };
}

function getThisMonthRange() {
  const now = new Date();
  return monthRange(now.getFullYear(), now.getMonth() + 1);
}

function getLastMonthRange() {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth(); // last month in 1..12
  return monthRange(year, month);
}

function isValidYMD(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

function readStored(): DateRangeValue {
  const preset =
    (localStorage.getItem(STORAGE_PRESET_KEY) as PresetKey) || "this_month";
  const from = localStorage.getItem(STORAGE_FROM_KEY);
  const to = localStorage.getItem(STORAGE_TO_KEY);

  // fallback: se não tiver nada salvo, default = este mês
  if (!localStorage.getItem(STORAGE_PRESET_KEY) && !from && !to) {
    const r = getThisMonthRange();
    return { preset: "this_month", from: r.from, to: r.to };
  }

  return {
    preset,
    from: from || null,
    to: to || null,
  };
}

function persist(value: DateRangeValue) {
  localStorage.setItem(STORAGE_PRESET_KEY, value.preset);

  // "Todo período"
  if (value.preset === "all_time") {
    localStorage.setItem(STORAGE_MONTH_KEY, "todos");
    localStorage.removeItem(STORAGE_FROM_KEY);
    localStorage.removeItem(STORAGE_TO_KEY);
    return;
  }

  // Range (este mês / mês passado / personalizado)
  localStorage.removeItem(STORAGE_MONTH_KEY);

  if (value.from) localStorage.setItem(STORAGE_FROM_KEY, value.from);
  else localStorage.removeItem(STORAGE_FROM_KEY);

  if (value.to) localStorage.setItem(STORAGE_TO_KEY, value.to);
  else localStorage.removeItem(STORAGE_TO_KEY);
}

function fireFilterChanged() {
  window.dispatchEvent(new Event(FILTER_EVENT));
}

function PresetPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-full text-sm border transition",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function DateRangeFilterDrawer({
  open,
  onClose,
  onApplied,
}: DateRangeFilterDrawerProps) {
  const [preset, setPreset] = React.useState<PresetKey>("this_month");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    setError(null);
    const stored = readStored();
    setPreset(stored.preset);
    setFrom(stored.from || "");
    setTo(stored.to || "");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    if (preset === "this_month") {
      const r = getThisMonthRange();
      setFrom(r.from);
      setTo(r.to);
    }
    if (preset === "last_month") {
      const r = getLastMonthRange();
      setFrom(r.from);
      setTo(r.to);
    }
    if (preset === "all_time") {
      setFrom("");
      setTo("");
    }
  }, [preset, open]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canApply = (() => {
    if (preset === "all_time") return true;

    if (!from || !to) return false;
    if (!isValidYMD(from) || !isValidYMD(to)) return false;

    const df = new Date(from + "T00:00:00").getTime();
    const dt = new Date(to + "T00:00:00").getTime();
    return df <= dt;
  })();

  function apply() {
    setError(null);

    if (preset !== "all_time") {
      if (!from || !to) {
        setError("Preencha as duas datas.");
        return;
      }
      if (!isValidYMD(from) || !isValidYMD(to)) {
        setError("Data inválida.");
        return;
      }
      const df = new Date(from + "T00:00:00").getTime();
      const dt = new Date(to + "T00:00:00").getTime();
      if (df > dt) {
        setError("O 'De' não pode ser maior que o 'Até'.");
        return;
      }
    }

    const value: DateRangeValue =
      preset === "all_time"
        ? { preset, from: null, to: null }
        : { preset, from: from || null, to: to || null };

    // salvar + avisar (Header e Dashboard escutam)
    persist(value);
    fireFilterChanged();

    onApplied?.(value);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* overlay */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Fechar"
      />

      {/* sheet (mobile first) */}
      <aside
        className="
          absolute bottom-0 left-0 w-full
          rounded-t-3xl
          bg-background shadow-2xl border-t
          animate-in slide-in-from-bottom duration-200
          flex flex-col
          max-h-[85vh]
          sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:rounded-3xl sm:border sm:w-[520px]
          sm:max-h-[80vh]
        "
        aria-label="Filtros do dashboard"
      >
        {/* header */}
        <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Defina um atalho ou selecione datas.
            </p>
          </div>

          <button
            className="p-2 rounded-2xl hover:bg-muted transition shrink-0"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* content */}
        <div className="px-4 py-4 overflow-y-auto flex-1 space-y-4">
          {/* presets */}
          <div className="flex flex-wrap gap-2">
            <PresetPill
              active={preset === "this_month"}
              onClick={() => setPreset("this_month")}
            >
              Este mês
            </PresetPill>

            <PresetPill
              active={preset === "last_month"}
              onClick={() => setPreset("last_month")}
            >
              Mês passado
            </PresetPill>

            <PresetPill
              active={preset === "all_time"}
              onClick={() => setPreset("all_time")}
            >
              Todo período
            </PresetPill>

            <PresetPill
              active={preset === "custom"}
              onClick={() => setPreset("custom")}
            >
              Personalizado
            </PresetPill>
          </div>

          {/* dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">De</p>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setPreset("custom");
                  setFrom(e.target.value);
                }}
                disabled={preset === "all_time"}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Até</p>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setPreset("custom");
                  setTo(e.target.value);
                }}
                disabled={preset === "all_time"}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            No celular, o seletor de data é nativo e mais rápido.
          </p>
        </div>

        {/* footer (stacked) */}
        <div className="px-4 py-4 border-t">
          <div className="grid grid-cols-1 gap-2">
            <Button className="w-full" onClick={apply} disabled={!canApply}>
              <Check className="h-4 w-4 mr-2" />
              Aplicar
            </Button>

            <Button variant="outline" className="w-full" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
