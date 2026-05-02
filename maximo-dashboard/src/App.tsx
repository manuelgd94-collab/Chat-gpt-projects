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
import { TablaDiaria } from './components/TablaDiaria';
import { Tabs, type Tab } from './components/Tabs';
import { NoProgramadasTab } from './components/tabs/NoProgramadasTab';
import { ListadoCompletoTab } from './components/tabs/ListadoCompletoTab';
import {
  applyFilters,
  areaSummary,
  atrasadasHoy,
  backlogSemanal,
  bucketByDay,
  curvaS,
  defaultTargetDate,
  disciplinaSummary,
  edadBacklogPromedio,
  matrixDisciplinaDia,
  noProgramadasFinalizadas,
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

const ATRASADAS_RE = /^(55|60)/;
const INCUMPLIMIENTO_RE = /^(32|40|50|90)/;

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

  const programadas = useMemo(() => filtered.filter((r) => r.inicioProgramado != null), [filtered]);
  const cerradas = useMemo(() => programadas.filter((r) => r.completada), [programadas]);
  const atrasadas = useMemo(() => atrasadasHoy(filtered), [filtered]);
  const cumplimiento = programadas.length > 0 ? cerradas.length / programadas.length : 0;

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
  const noProgFinal = useMemo(() => noProgramadasFinalizadas(filtered), [filtered]);
  const otsAtrasadasList = useMemo(() => filtered.filter((r) => ATRASADAS_RE.test(r.estado.trim())), [filtered]);
  const otsIncumplimientoList = useMemo(
    () => filtered.filter((r) => INCUMPLIMIENTO_RE.test(r.estado.trim())),
    [filtered],
  );

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

  const tabs: Tab[] = [
    {
      id: 'resumen',
      label: 'Resumen diario',
      content: (
        <div className="space-y-6">
          <KpiCards
            data={{
              programadas: programadas.length,
              cerradas: cerradas.length,
              pendientes: programadas.length - cerradas.length,
              atrasadas: atrasadas.length,
              cumplimiento,
            }}
          />
          <KpisPlanificacion
            pm={pm}
            backlogCount={backlog.length}
            backlogEdadDias={backlogEdad}
            npPlan={npPlan}
            npReal={npReal}
          />
          <TablaDiaria rows={filtered} />
          <AdherenciaDiaria rows={rows} fecha={diaObjetivo} onChangeFecha={setDiaObjetivo} />
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlanVsReal data={buckets} onSelectDia={setDiaObjetivo} />
            <CurvaS data={curva} />
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NPSeguimiento data={npBuckets} onSelectDia={setDiaObjetivo} />
            <DistribucionPrioridad data={prioridades} />
          </section>
        </div>
      ),
    },
    {
      id: 'especialidad',
      label: 'Adherencia por especialidad',
      content: (
        <div className="space-y-6">
          <DisciplinaPills
            rows={filteredExceptDisciplina}
            value={filters.disciplina}
            onChange={(d) => setFilters({ ...filters, disciplina: d })}
          />
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
        </div>
      ),
    },
    {
      id: 'atrasadas',
      label: 'OTs Atrasadas',
      badge: otsAtrasadasList.length,
      badgeTone: 'amber',
      content: (
        <OtListas
          rows={filtered}
          show="atrasadas"
        />
      ),
    },
    {
      id: 'incumplimiento',
      label: 'OTs Incumplimiento',
      badge: otsIncumplimientoList.length,
      badgeTone: 'red',
      content: (
        <OtListas
          rows={filtered}
          show="incumplimiento"
        />
      ),
    },
    {
      id: 'noprog',
      label: 'No Programadas',
      badge: noProgFinal.length,
      content: <NoProgramadasTab rows={filtered} />,
    },
    {
      id: 'listado',
      label: 'Listado completo',
      badge: filtered.length,
      content: <ListadoCompletoTab rows={filtered} />,
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Dashboard Maximo — Cumplimiento semanal</h1>
            <p className="text-xs text-slate-500">
              Client-side · IndexedDB local · Puerto Pipeline · turno 7×7
            </p>
          </div>
          {activeWeek && (
            <div className="text-right text-xs text-slate-500">
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
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Cargando OTs de {activeWeek.weekId}…
          </div>
        ) : (
          <>
            <FiltersBar rows={rows} value={filters} onChange={setFilters} />
            <Tabs tabs={tabs} defaultTab="resumen" />
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-slate-500">
        Estados Maximo: <code>32-WPCOND</code> · <code>40-WMATL</code> · <code>50-WSCH</code> · <code>55-SCH</code> · <code>60-INPRG</code> · <code>70-COMP</code>. Cerrada = estado <code>70-COMP</code>. Umbrales: 🟢 ≥ 85% · 🟡 70-84% · 🔴 &lt; 70%.
      </footer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="text-lg font-semibold">Aún no hay semanas cargadas</div>
      <div className="mt-2 text-sm text-slate-500 max-w-2xl mx-auto">
        <p>Flujo recomendado:</p>
        <ol className="list-decimal text-left max-w-md mx-auto mt-2 space-y-1">
          <li>Pulsa <strong>📚 Cargar base semanal</strong> con el archivo de la nueva semana (ej. <code>Adherencia diaria SEM 16.xlsx</code>).</li>
          <li>Cada día pulsa <strong>🔄 Actualizar con export diario</strong> con el export de Maximo (<code>NNNNNNNN.xls</code>).</li>
          <li>Al final de la semana, carga la siguiente base. Las semanas previas quedan guardadas y consultables.</li>
        </ol>
      </div>
    </div>
  );
}
