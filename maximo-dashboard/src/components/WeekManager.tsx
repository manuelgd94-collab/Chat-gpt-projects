import { useRef, useState } from 'react';
import type { WeekMeta } from '../lib/db';
import { applyDaily, deleteWeek, saveBase } from '../lib/db';
import { parseWorkbook } from '../lib/parser';

interface Props {
  weeks: WeekMeta[];
  activeWeekId: string | null;
  onActiveWeekChange: (weekId: string | null) => void;
  onChange: () => void;
}

export function WeekManager({ weeks, activeWeekId, onActiveWeekChange, onChange }: Props) {
  const baseInputRef = useRef<HTMLInputElement | null>(null);
  const dailyInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const activeWeek = weeks.find((w) => w.weekId === activeWeekId) ?? null;

  async function handleBase(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const parsed = await parseWorkbook(file);
      const result = await saveBase(file.name, parsed.rows);
      setMsg({
        kind: 'ok',
        text: `Base cargada: ${result.weekId} · ${result.inserted} OTs (hoja: ${parsed.sheetName}).`,
      });
      onActiveWeekChange(result.weekId);
      onChange();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleDaily(file: File) {
    if (!activeWeekId) {
      setMsg({ kind: 'err', text: 'Selecciona una semana activa antes de actualizar.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const parsed = await parseWorkbook(file);
      const today = isoDay(new Date());
      const result = await applyDaily(activeWeekId, file.name, parsed.rows, today);
      setMsg({
        kind: 'ok',
        text: `Día ${today} actualizado en ${result.weekId} · ${result.updated} actualizadas, ${result.added} nuevas, ${result.ignored} ignoradas (otra semana).`,
      });
      onChange();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeWeekId) return;
    if (!confirm(`¿Borrar la semana ${activeWeekId} y todas sus OTs?`)) return;
    setBusy(true);
    try {
      await deleteWeek(activeWeekId);
      setMsg({ kind: 'ok', text: `Semana ${activeWeekId} borrada.` });
      onActiveWeekChange(null);
      onChange();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Gestión semanal</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Carga una base por semana y actualízala cada día con el export de Maximo. Los datos quedan guardados en
            tu navegador (IndexedDB).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Semana activa</label>
          <select
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm"
            value={activeWeekId ?? ''}
            onChange={(e) => onActiveWeekChange(e.target.value || null)}
          >
            <option value="">— ninguna —</option>
            {weeks.map((w) => (
              <option key={w.weekId} value={w.weekId}>
                {w.weekId} ({w.baseRowCount} OTs)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={baseInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleBase(f);
            e.target.value = '';
          }}
        />
        <button
          disabled={busy}
          onClick={() => baseInputRef.current?.click()}
          className="rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm px-4 py-2"
        >
          📚 Cargar base semanal
        </button>

        <input
          ref={dailyInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleDaily(f);
            e.target.value = '';
          }}
        />
        <button
          disabled={busy || !activeWeekId}
          onClick={() => dailyInputRef.current?.click()}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm px-4 py-2"
        >
          🔄 Actualizar con export diario
        </button>

        {activeWeekId && (
          <button
            disabled={busy}
            onClick={handleDelete}
            className="rounded-lg border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30 text-sm px-4 py-2"
          >
            🗑️ Borrar semana
          </button>
        )}
      </div>

      {activeWeek && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Info label="Base" value={`${activeWeek.baseFileName}`} hint={fmtDate(activeWeek.createdAt)} />
          <Info
            label="Última actualización"
            value={activeWeek.lastUpdateFileName ?? '—'}
            hint={activeWeek.lastUpdateAt ? fmtDate(activeWeek.lastUpdateAt) : 'sin actualizaciones'}
          />
          <Info
            label="Días actualizados"
            value={activeWeek.updatedDays.length === 0 ? '—' : activeWeek.updatedDays.join(', ')}
            hint={`${activeWeek.updatedDays.length} de 7`}
          />
        </div>
      )}

      {msg && (
        <pre
          className={`mt-3 rounded-lg px-3 py-2 text-xs whitespace-pre-wrap font-mono ${
            msg.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200'
          }`}
        >
          {msg.text}
        </pre>
      )}
    </div>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-medium truncate" title={value}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
