import { useEffect, useMemo, useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { FiltersBar } from './components/Filters';
import { KpiCards } from './components/KpiCards';
import { PlanVsReal } from './components/PlanVsReal';
import { CurvaS } from './components/CurvaS';
import { Matrix } from './components/Matrix';
import { AreaSummary } from './components/AreaSummary';
import { AdherenciaDiaria } from './components/AdherenciaDiaria';
import { parseWorkbook } from './lib/parser';
import {
  applyFilters,
  areaSummary,
  bucketByDay,
  computeKpis,
  curvaS,
  defaultTargetDate,
  matrixDisciplinaDia,
} from './lib/kpi';
import type { Filters, WorkOrder } from './lib/types';

const DEFAULT_FILTERS: Filters = {
  semana: 'TODAS',
  area: 'TODAS',
  programa: 'TODOS',
  disciplina: 'TODAS',
};

export default function App() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [diaObjetivo, setDiaObjetivo] = useState<string>(() => defaultTargetDate());

  const onFile = async (f: File) => {
    setLoading(true);
    setError(null);
    try {
      const r = await parseWorkbook(f);
      setRows(r.rows);
      setFileName(f.name);
      setSheetName(r.sheetName);
      setFilters(DEFAULT_FILTERS);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const kpi = useMemo(() => computeKpis(filtered), [filtered]);
  const buckets = useMemo(() => bucketByDay(filtered), [filtered]);
  const curva = useMemo(() => curvaS(buckets), [buckets]);
  const matrix = useMemo(() => matrixDisciplinaDia(filtered), [filtered]);
  const areas = useMemo(() => areaSummary(filtered), [filtered]);

  useEffect(() => {
    if (rows.length === 0) return;
    const fechas = new Set(
      rows
        .map((r) => r.inicioProgramado)
        .filter((d): d is Date => !!d)
        .map((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`),
    );
    if (!fechas.has(diaObjetivo) && fechas.size > 0) {
      const sorted = Array.from(fechas).sort();
      setDiaObjetivo(sorted[sorted.length - 1]);
    }
  }, [rows, diaObjetivo]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Dashboard Maximo — Cumplimiento semanal</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Client-side · el Excel no sale del navegador · Puerto Pipeline
            </p>
          </div>
          {fileName && (
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <div className="font-medium">{fileName}</div>
              <div>Hoja: {sheetName} · {rows.length} OT</div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {rows.length === 0 ? (
          <FileUpload onFile={onFile} loading={loading} error={error} />
        ) : (
          <>
            <AdherenciaDiaria rows={rows} fecha={diaObjetivo} onChangeFecha={setDiaObjetivo} />

            <section className="flex flex-col gap-4">
              <FiltersBar rows={rows} value={filters} onChange={setFilters} />
              <KpiCards kpi={kpi} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PlanVsReal data={buckets} />
              <CurvaS data={curva} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Matrix disciplinas={matrix.disciplinas} dias={matrix.dias} cells={matrix.cells} />
              <AreaSummary rows={areas} />
            </section>

            <Limitations />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRows([]);
                  setFileName(null);
                  setSheetName(null);
                  setFilters(DEFAULT_FILTERS);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cargar otro archivo
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
        Construido con React · Vite · Tailwind · Recharts · SheetJS. Estados Maximo:
        {' '}
        <code>32-WPCOND</code>, <code>55-SCH</code>, <code>60-INPRG</code>, <code>70-COMP</code>. Completada = estado empieza con <code>70</code>.
      </footer>
    </div>
  );
}

function Limitations() {
  return (
    <details className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-300">
        Limitaciones conocidas del cálculo de Adherencia
      </summary>
      <div className="mt-2 space-y-2 text-amber-900 dark:text-amber-200">
        <p>
          El export Maximo actual no incluye la fecha <em>real</em> de ejecución. Por eso la Adherencia (de la sección
          de KPIs globales) se calcula como: <strong>OTs completadas cuyo "Inicio previsto" coincide en día con
          "Inicio programado"</strong>, sobre el total de OTs completadas. La tabla "Adherencia Diaria" usa la
          definición operativa actual: <strong>OTs en 70-COMP / Total programadas del día</strong>, replicando el
          pivote manual.
        </p>
        <p>
          Cuando el export incorpore un campo de "Inicio real" o "Fecha de ejecución", reemplazar en{' '}
          <code>src/lib/kpi.ts → computeKpis</code> la comparación <code>inicioPrevisto vs inicioProgramado</code> por
          <code> inicioReal vs inicioProgramado</code>.
        </p>
      </div>
    </details>
  );
}
