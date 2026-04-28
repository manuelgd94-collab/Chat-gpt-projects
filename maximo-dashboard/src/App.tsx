import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiltersBar } from './components/Filters';
import { KpiCards } from './components/KpiCards';
import { PlanVsReal } from './components/PlanVsReal';
import { CurvaS } from './components/CurvaS';
import { Matrix } from './components/Matrix';
import { AreaSummary } from './components/AreaSummary';
import { AdherenciaDiaria } from './components/AdherenciaDiaria';
import { WeekManager } from './components/WeekManager';
import { OtListas } from './components/OtListas';
import { DisciplinaPills } from './components/DisciplinaPills';
import { DisciplinaSummary } from './components/DisciplinaSummary';
import { CodigosSinClasificar } from './components/CodigosSinClasificar';
import { KpisPlanificacion } from './components/KpisPlanificacion';
import { NPSeguimiento } from './components/NPSeguimiento';
import { DistribucionPrioridad } from './components/DistribucionPrioridad';
import {
  applyFilters,
  areaSummary,
  backlogSemanal,
  bucketByDay,
  computeKpis,
  curvaS,
  defaultTargetDate,
  disciplinaSummary,
  edadBacklogPromedio,
  matrixDisciplinaDia,
  npDailyBuckets,
  pmCompliance,
  prioridadBuckets,
} from './lib/kpi';
import { getWeekOrders, listWeeks, type WeekMeta } from './lib/db';
import type { Filters, WorkOrder } from './lib/types';

const DEFAULT_FILTERS: Filters = {
  semana: 'TODAS',
  area: 'TODAS',
  programa: 'TODOS',
  disciplina: 'TODAS',
};

const ACTIVE_WEEK_KEY = 'maximo-dashboard:activeWeek';

export default function App() {
  const [weeks, setWeeks] = useState<WeekMeta[]>([]);
  const [activeWeekId, setActiveWeekIdState] = useState<string | null>(() =>
    localStorage.getItem(ACTIVE_WEEK_KEY),
  );
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [diaObjetivo, setDiaObjetivo] = useState<string>(() => defaultTargetDate());
  const [bumpId, setBumpId] = useState(0);

  const setActiveWeekId = useCallback((id: string | null) => {
    setActiveWeekIdState(id);
    if (id) localStorage.setItem(ACTIVE_WEEK_KEY, id);
    else localStorage.removeItem(ACTIVE_WEEK_KEY);
  }, []);

  const refresh = useCallback(() => setBumpId((n) => n + 1), []);

  useEffect(() => {
    listWeeks().then((ws) => {
      setWeeks(ws);
      if (ws.length > 0 && (!activeWeekId || !ws.some((w) => w.weekId === activeWeekId))) {
        setActiveWeekId(ws[ws.length - 1].weekId);
      }
      if (ws.length === 0) setActiveWeekId(null);
    });
  }, [bumpId, activeWeekId, setActiveWeekId]);

  useEffect(() => {
    if (!activeWeekId) {
      setRows([]);
      return;
    }
    getWeekOrders(activeWeekId).then(setRows);
  }, [activeWeekId, bumpId]);

  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const filteredExceptDisciplina = useMemo(
    () => applyFilters(rows, { ...filters, disciplina: 'TODAS' }),
    [rows, filters],
  );
  const kpi = useMemo(() => computeKpis(filtered), [filtered]);
  const buckets = useMemo(() => bucketByDay(filtered), [filtered]);
  const curva = useMemo(() => curvaS(buckets), [buckets]);
  const matrix = useMemo(() => matrixDisciplinaDia(filtered), [filtered]);
  const areas = useMemo(() => areaSummary(filtered), [filtered]);
  const discSummary = useMemo(() => disciplinaSummary(filteredExceptDisciplina), [filteredExceptDisciplina]);
  const pm = useMemo(() => pmCompliance(filtered), [filtered]);
  const backlog = useMemo(() => backlogSemanal(filtered), [filtered]);
  const backlogEdad = useMemo(() => edadBacklogPromedio(filtered), [filtered]);
  const npBuckets = useMemo(() => npDailyBuckets(filtered), [filtered]);
  const npPlan = useMemo(() => npBuckets.reduce((s, b) => s + b.plan, 0), [npBuckets]);
  const npReal = useMemo(() => npBuckets.reduce((s, b) => s + b.real, 0), [npBuckets]);
  const prioridades = useMemo(() => prioridadBuckets(filtered), [filtered]);

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

  const activeWeek = weeks.find((w) => w.weekId === activeWeekId) ?? null;
  const hasData = rows.length > 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Dashboard Maximo — Cumplimiento semanal</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Client-side · IndexedDB local · Puerto Pipeline · turno 7×7
            </p>
          </div>
          {activeWeek && (
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <div className="font-medium">Semana activa: {activeWeek.weekId}</div>
              <div>{rows.length} OTs · {activeWeek.updatedDays.length} días actualizados</div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <WeekManager
          weeks={weeks}
          activeWeekId={activeWeekId}
          onActiveWeekChange={setActiveWeekId}
          onChange={refresh}
        />

        {!activeWeek ? (
          <EmptyState />
        ) : !hasData ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-500">
            Cargando OTs de {activeWeek.weekId}…
          </div>
        ) : (
          <>
            <AdherenciaDiaria rows={rows} fecha={diaObjetivo} onChangeFecha={setDiaObjetivo} />

            <DisciplinaPills
              rows={filteredExceptDisciplina}
              value={filters.disciplina}
              onChange={(d) => setFilters({ ...filters, disciplina: d })}
            />

            <section className="flex flex-col gap-4">
              <FiltersBar rows={rows} value={filters} onChange={setFilters} />
              <KpiCards kpi={kpi} />
              <KpisPlanificacion
                pm={pm}
                backlogCount={backlog.length}
                backlogEdadDias={backlogEdad}
                npPlan={npPlan}
                npReal={npReal}
              />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PlanVsReal data={buckets} onSelectDia={setDiaObjetivo} />
              <CurvaS data={curva} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NPSeguimiento data={npBuckets} onSelectDia={setDiaObjetivo} />
              <DistribucionPrioridad data={prioridades} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Matrix disciplinas={matrix.disciplinas} dias={matrix.dias} cells={matrix.cells} />
              <DisciplinaSummary
                rows={discSummary}
                activeDisciplina={filters.disciplina}
                onSelectDisciplina={(d) => setFilters({ ...filters, disciplina: d })}
              />
            </section>

            <AreaSummary rows={areas} />

            <CodigosSinClasificar rows={filteredExceptDisciplina} />

            <OtListas rows={filtered} />

            <Limitations />
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
        Construido con React · Vite · Tailwind · Recharts · SheetJS · IndexedDB. Estados Maximo:
        {' '}
        <code>32-WPCOND</code>, <code>55-SCH</code>, <code>60-INPRG</code>, <code>70-COMP</code>. Completada = estado empieza con <code>70</code>.
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center">
      <div className="text-lg font-semibold">Aún no hay semanas cargadas</div>
      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
        <p>Flujo recomendado:</p>
        <ol className="list-decimal text-left max-w-md mx-auto mt-2 space-y-1">
          <li>Pulsa <strong>📚 Cargar base semanal</strong> con el archivo de la nueva semana (ej. <code>Adherencia diaria SEM 16.xlsx</code>).</li>
          <li>Cada día pulsa <strong>🔄 Actualizar con export diario</strong> con el export de Maximo (<code>NNNNNNNN.xls</code>) — sólo se actualizan los estados de las OTs ya registradas.</li>
          <li>Al final de la semana, carga la siguiente base. Las semanas previas quedan guardadas y consultables.</li>
        </ol>
      </div>
    </div>
  );
}

function Limitations() {
  return (
    <details className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-300">
        Limitaciones conocidas y supuestos
      </summary>
      <div className="mt-2 space-y-2 text-amber-900 dark:text-amber-200">
        <p>
          <strong>Adherencia Diaria:</strong> usa <code>OTs en 70-COMP / Total programadas del día</code>, replicando
          el pivote manual mientras Maximo no exporte la fecha real de ejecución.
        </p>
        <p>
          <strong>Adherencia (KPI global):</strong> compara <code>Inicio previsto</code> vs <code>Inicio programado</code>
          {' '}sobre OTs completadas. Cuando exista fecha real, reemplazar en <code>src/lib/kpi.ts → computeKpis</code>.
        </p>
        <p>
          <strong>Persistencia:</strong> los datos se guardan en IndexedDB del navegador (local, no se sincronizan).
          Si cambias de equipo o limpias datos del sitio, hay que recargar las bases.
        </p>
      </div>
    </details>
  );
}
