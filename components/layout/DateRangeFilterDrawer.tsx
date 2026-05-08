"use client";

import * as React from "react";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";

// 1. Adicionado "next_month" aos presets
type PresetKey =
  | "this_month"
  | "last_month"
  | "next_month"
  | "all_time"
  | "custom";

export type DateRangeValue = {
  from: string | null;
  to: string | null;
  preset: PresetKey;
};

interface DateRangeFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApplied?: (value: DateRangeValue) => void;
}

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

function parseYMD(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
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
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return monthRange(year, month);
}

// 2. Nova função para calcular as datas do próximo mês
function getNextMonthRange() {
  const now = new Date();
  // O JavaScript lida automaticamente com a virada de ano ao passar um mês > 11
  const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return monthRange(nextDate.getFullYear(), nextDate.getMonth() + 1);
}

function readStored(): DateRangeValue {
  const preset = localStorage.getItem(STORAGE_PRESET_KEY) as PresetKey;
  const from = localStorage.getItem(STORAGE_FROM_KEY);
  const to = localStorage.getItem(STORAGE_TO_KEY);

  if (!preset || preset === "this_month") {
    const r = getThisMonthRange();

    if (from !== r.from || to !== r.to) {
      localStorage.setItem(STORAGE_FROM_KEY, r.from);
      localStorage.setItem(STORAGE_TO_KEY, r.to);
      localStorage.setItem(STORAGE_PRESET_KEY, "this_month");
    }

    return { preset: "this_month", from: r.from, to: r.to };
  }

  return { preset, from: from || null, to: to || null };
}

function persist(value: DateRangeValue) {
  localStorage.setItem(STORAGE_PRESET_KEY, value.preset);

  if (value.preset === "all_time") {
    localStorage.setItem(STORAGE_MONTH_KEY, "todos");
    localStorage.removeItem(STORAGE_FROM_KEY);
    localStorage.removeItem(STORAGE_TO_KEY);
    return;
  }

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

function DateInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onChange: (ymd: string | null) => void;
}) {
  const [localValue, setLocalValue] = React.useState("");
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!value) {
      setLocalValue("");
      setError(false);
      return;
    }
    const [y, m, d] = value.split("-");
    if (y && m && d) {
      setLocalValue(`${d}/${m}/${y}`);
      setError(false);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }

    setLocalValue(formatted);

    if (formatted.length === 0) {
      setError(false);
      onChange(null);
      return;
    }

    if (raw.length === 8) {
      const d = parseInt(raw.slice(0, 2), 10);
      const m = parseInt(raw.slice(2, 4), 10);
      const y = parseInt(raw.slice(4), 10);

      const date = new Date(y, m - 1, d);

      if (
        date.getFullYear() === y &&
        date.getMonth() === m - 1 &&
        date.getDate() === d
      ) {
        setError(false);
        onChange(
          `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        );
      } else {
        setError(true);
        onChange(null);
      }
    } else {
      setError(false);
    }
  };

  const handleBlur = () => {
    if (localValue.length > 0 && localValue.length < 10) {
      setError(true);
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <input
        type="text"
        placeholder="DD/MM/AAAA"
        disabled={disabled}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`flex h-10 w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-destructive text-destructive focus:ring-1 focus:ring-destructive"
            : "border-input focus:ring-1 focus:ring-primary"
        }`}
      />
    </div>
  );
}

export default function DateRangeFilterDrawer({
  open,
  onClose,
  onApplied,
}: DateRangeFilterDrawerProps) {
  const [preset, setPreset] = React.useState<PresetKey>("this_month");
  const [from, setFrom] = React.useState<string | null>(null);
  const [to, setTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    const stored = readStored();
    setPreset(stored.preset);
    setFrom(stored.from);
    setTo(stored.to);
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
    // 3. Adicionada a regra para quando o preset "next_month" for selecionado
    if (preset === "next_month") {
      const r = getNextMonthRange();
      setFrom(r.from);
      setTo(r.to);
    }
    if (preset === "all_time") {
      setFrom(null);
      setTo(null);
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
    const df = parseYMD(from)?.getTime();
    const dt = parseYMD(to)?.getTime();
    if (!df || !dt) return false;
    return df <= dt;
  })();

  function apply() {
    setError(null);

    if (preset !== "all_time") {
      if (!from || !to) {
        setError("Selecione (ou digite) datas válidas.");
        return;
      }
      const df = parseYMD(from)?.getTime();
      const dt = parseYMD(to)?.getTime();
      if (!df || !dt) {
        setError("Data inválida.");
        return;
      }
      if (df > dt) {
        setError("A data 'De' não pode ser maior que o 'Até'.");
        return;
      }
    }

    const value: DateRangeValue =
      preset === "all_time"
        ? { preset, from: null, to: null }
        : { preset, from, to };

    persist(value);
    fireFilterChanged();
    onApplied?.(value);
    onClose();
  }

  const disableDates = preset !== "custom";

  return (
    <div className="fixed inset-0 z-120" aria-modal="true" role="dialog">
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Fechar"
        tabIndex={-1}
      />

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
        <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Período
            </p>
          </div>

          <button
            className="p-2 rounded-2xl hover:bg-muted transition shrink-0"
            onClick={onClose}
            aria-label="Fechar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4 overflow-y-auto flex-1 space-y-4">
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

            {/* 4. Botão novo para o Próximo Mês */}
            <PresetPill
              active={preset === "next_month"}
              onClick={() => setPreset("next_month")}
            >
              Próx. mês
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DateInput
              label="De"
              value={from}
              disabled={disableDates}
              onChange={(ymd) => {
                setPreset("custom");
                setFrom(ymd);
              }}
            />

            <DateInput
              label="Até"
              value={to}
              disabled={disableDates}
              onChange={(ymd) => {
                setPreset("custom");
                setTo(ymd);
              }}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <div className="px-4 py-4 border-t">
          <div className="grid grid-cols-1 gap-2">
            <Button className="w-full" onClick={apply} disabled={!canApply}>
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
