import type { DayBucket, Filters, KpiSummary, MatrixCell, WorkOrder } from './types';
import { dayKey, dayLabel, derivePrograma, isNP, sameDay, tipoMantenimiento } from './derive';

export function applyFilters(rows: WorkOrder[], f: Filters): WorkOrder[] {
  return rows.filter((r) => {
    if (f.semana !== 'TODAS' && r.semana !== f.semana) return false;
    if (f.area !== 'TODAS' && r.area !== f.area) return false;
    if (f.programa !== 'TODOS' && derivePrograma(r) !== f.programa) return false;
    if (f.disciplina !== 'TODAS' && r.disciplina !== f.disciplina) return false;
    return true;
  });
}

export function computeKpis(rows: WorkOrder[]): KpiSummary {
  const planCount = rows.filter((r) => r.inicioProgramado != null).length;
  const realCount = rows.filter((r) => r.completada).length;
  const cumplimiento = planCount > 0 ? realCount / planCount : 0;

  const completadas = rows.filter((r) => r.completada);
  const adherentes = completadas.filter((r) => sameDay(r.inicioPrevisto, r.inicioProgramado)).length;
  const adherencia = completadas.length > 0 ? adherentes / completadas.length : 0;

  return {
    planCount,
    realCount,
    cumplimiento,
    adherencia,
    desviacion: realCount - planCount,
  };
}

export function bucketByDay(rows: WorkOrder[]): DayBucket[] {
  const map = new Map<string, { plan: number; real: number }>();

  for (const r of rows) {
    const planKey = dayKey(r.inicioProgramado);
    if (planKey) {
      const b = map.get(planKey) ?? { plan: 0, real: 0 };
      b.plan++;
      map.set(planKey, b);
    }
    if (r.completada) {
      const realKey = dayKey(r.inicioProgramado) ?? dayKey(r.inicioPrevisto);
      if (realKey) {
        const b = map.get(realKey) ?? { plan: 0, real: 0 };
        b.real++;
        map.set(realKey, b);
      }
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, label: dayLabel(dia), plan: v.plan, real: v.real }));
}

export interface CurvaSPoint {
  dia: string;
  label: string;
  pctPlan: number;
  pctReal: number;
}

export function curvaS(buckets: DayBucket[]): CurvaSPoint[] {
  const totalPlan = buckets.reduce((s, b) => s + b.plan, 0);
  const totalReal = buckets.reduce((s, b) => s + b.real, 0);
  const denom = Math.max(totalPlan, 1);
  let accPlan = 0;
  let accReal = 0;
  const out: CurvaSPoint[] = [];
  for (const b of buckets) {
    accPlan += b.plan;
    accReal += b.real;
    out.push({
      dia: b.dia,
      label: b.label,
      pctPlan: accPlan / denom,
      pctReal: accReal / denom,
    });
  }
  void totalReal;
  return out;
}

export function matrixDisciplinaDia(rows: WorkOrder[]): {
  disciplinas: string[];
  dias: { dia: string; label: string }[];
  cells: Map<string, MatrixCell>;
} {
  const disciplinasSet = new Set<string>();
  const diasSet = new Set<string>();
  const buckets = new Map<string, { plan: number; real: number }>();

  for (const r of rows) {
    disciplinasSet.add(r.disciplina);
    const planKey = dayKey(r.inicioProgramado);
    if (planKey) {
      diasSet.add(planKey);
      const k = `${r.disciplina}__${planKey}`;
      const b = buckets.get(k) ?? { plan: 0, real: 0 };
      b.plan++;
      buckets.set(k, b);
    }
    if (r.completada) {
      const realKey = dayKey(r.inicioProgramado) ?? dayKey(r.inicioPrevisto);
      if (realKey) {
        diasSet.add(realKey);
        const k = `${r.disciplina}__${realKey}`;
        const b = buckets.get(k) ?? { plan: 0, real: 0 };
        b.real++;
        buckets.set(k, b);
      }
    }
  }

  const disciplinas = Array.from(disciplinasSet).sort();
  const dias = Array.from(diasSet)
    .sort()
    .map((d) => ({ dia: d, label: dayLabel(d) }));

  const cells = new Map<string, MatrixCell>();
  for (const d of disciplinas) {
    for (const { dia } of dias) {
      const k = `${d}__${dia}`;
      const b = buckets.get(k) ?? { plan: 0, real: 0 };
      const pct = b.plan > 0 ? b.real / b.plan : b.real > 0 ? 1 : 0;
      cells.set(k, { disciplina: d, dia, plan: b.plan, real: b.real, pct });
    }
  }
  return { disciplinas, dias, cells };
}

export interface AreaSummaryRow {
  area: string;
  plan: number;
  real: number;
  cumplimiento: number;
  adherencia: number;
}

export function areaSummary(rows: WorkOrder[]): AreaSummaryRow[] {
  const byArea = new Map<string, WorkOrder[]>();
  for (const r of rows) {
    const list = byArea.get(r.area) ?? [];
    list.push(r);
    byArea.set(r.area, list);
  }
  return Array.from(byArea.entries())
    .map(([area, list]) => {
      const k = computeKpis(list);
      return { area, plan: k.planCount, real: k.realCount, cumplimiento: k.cumplimiento, adherencia: k.adherencia };
    })
    .sort((a, b) => b.plan - a.plan);
}

export interface DisciplinaSummaryRow {
  disciplina: string;
  plan: number;
  real: number;
  cumplimiento: number;
  adherencia: number;
}

export function disciplinaSummary(rows: WorkOrder[]): DisciplinaSummaryRow[] {
  const byDisc = new Map<string, WorkOrder[]>();
  for (const r of rows) {
    const list = byDisc.get(r.disciplina) ?? [];
    list.push(r);
    byDisc.set(r.disciplina, list);
  }
  return Array.from(byDisc.entries())
    .map(([disciplina, list]) => {
      const k = computeKpis(list);
      return {
        disciplina,
        plan: k.planCount,
        real: k.realCount,
        cumplimiento: k.cumplimiento,
        adherencia: k.adherencia,
      };
    })
    .sort((a, b) => b.plan - a.plan);
}

export function uniqueSemanas(rows: WorkOrder[]): string[] {
  return Array.from(new Set(rows.map((r) => r.semana).filter((s): s is string => !!s))).sort();
}

export function uniqueDisciplinas(rows: WorkOrder[]): string[] {
  return Array.from(new Set(rows.map((r) => r.disciplina))).sort();
}

export function uniqueProgramas(rows: WorkOrder[]): string[] {
  return Array.from(new Set(rows.map(derivePrograma))).sort();
}

export function uniqueAreas(rows: WorkOrder[]): string[] {
  return Array.from(new Set(rows.map((r) => r.area))).sort();
}

export const ESTADOS_PIVOT = ['32-WPCOND', '55-SCH', '60-INPRG', '70-COMP'] as const;
export type EstadoPivot = (typeof ESTADOS_PIVOT)[number];

function normalizeEstado(estado: string): EstadoPivot | null {
  const s = (estado ?? '').trim().toUpperCase().replace(/\s+/g, '');
  for (const e of ESTADOS_PIVOT) {
    if (s.startsWith(e.toUpperCase())) return e;
  }
  return null;
}

export interface PivotRow {
  disciplina: string;
  counts: Record<EstadoPivot, number>;
  total: number;
  adherencia: number;
}

export interface DailyAdherencePivot {
  fecha: string;
  rows: PivotRow[];
  totalRow: PivotRow;
}

export function adherenciaDiariaPivot(allRows: WorkOrder[], fecha: string): DailyAdherencePivot {
  const dayRows = allRows.filter((r) => dayKey(r.inicioProgramado) === fecha);

  const byDisc = new Map<string, Record<EstadoPivot, number>>();
  for (const r of dayRows) {
    const est = normalizeEstado(r.estado);
    if (!est) continue;
    const counts = byDisc.get(r.disciplina) ?? makeEmptyCounts();
    counts[est] += 1;
    byDisc.set(r.disciplina, counts);
  }

  const rows: PivotRow[] = Array.from(byDisc.entries())
    .map(([disciplina, counts]) => {
      const total = ESTADOS_PIVOT.reduce((s, e) => s + counts[e], 0);
      const adherencia = total > 0 ? counts['70-COMP'] / total : 0;
      return { disciplina, counts, total, adherencia };
    })
    .sort((a, b) => a.disciplina.localeCompare(b.disciplina));

  const totalCounts = makeEmptyCounts();
  for (const r of rows) {
    for (const e of ESTADOS_PIVOT) totalCounts[e] += r.counts[e];
  }
  const grandTotal = ESTADOS_PIVOT.reduce((s, e) => s + totalCounts[e], 0);
  const totalRow: PivotRow = {
    disciplina: 'Total general',
    counts: totalCounts,
    total: grandTotal,
    adherencia: grandTotal > 0 ? totalCounts['70-COMP'] / grandTotal : 0,
  };

  return { fecha, rows, totalRow };
}

function makeEmptyCounts(): Record<EstadoPivot, number> {
  return { '32-WPCOND': 0, '55-SCH': 0, '60-INPRG': 0, '70-COMP': 0 };
}

export function defaultTargetDate(now: Date = new Date()): string {
  const d = new Date(now);
  if (now.getHours() < 9) {
    d.setDate(d.getDate() - 1);
  } else {
    d.setDate(d.getDate() - 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface PmComplianceResult {
  pmPlan: number;
  pmReal: number;
  pmRatio: number;
  cmPlan: number;
  cmReal: number;
  cmRatio: number;
  otroPlan: number;
  otroReal: number;
  ratioPmCm: number;
}

export function pmCompliance(rows: WorkOrder[]): PmComplianceResult {
  let pmPlan = 0;
  let pmReal = 0;
  let cmPlan = 0;
  let cmReal = 0;
  let otroPlan = 0;
  let otroReal = 0;
  for (const r of rows) {
    if (r.inicioProgramado == null) continue;
    const tipo = tipoMantenimiento(r);
    if (tipo === 'Preventivo') {
      pmPlan++;
      if (r.completada) pmReal++;
    } else if (tipo === 'Correctivo') {
      cmPlan++;
      if (r.completada) cmReal++;
    } else {
      otroPlan++;
      if (r.completada) otroReal++;
    }
  }
  const totalPmCm = pmPlan + cmPlan;
  return {
    pmPlan,
    pmReal,
    pmRatio: pmPlan > 0 ? pmReal / pmPlan : 0,
    cmPlan,
    cmReal,
    cmRatio: cmPlan > 0 ? cmReal / cmPlan : 0,
    otroPlan,
    otroReal,
    ratioPmCm: totalPmCm > 0 ? pmPlan / totalPmCm : 0,
  };
}

export function backlogSemanal(rows: WorkOrder[], hoy: Date = new Date()): WorkOrder[] {
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
  return rows.filter((r) => {
    if (r.completada) return false;
    if (!r.inicioProgramado) return false;
    return r.inicioProgramado.getTime() <= hasta.getTime();
  });
}

export interface NPBucket {
  dia: string;
  label: string;
  plan: number;
  real: number;
}

export function npDailyBuckets(rows: WorkOrder[]): NPBucket[] {
  const nps = rows.filter(isNP);
  const map = new Map<string, { plan: number; real: number }>();
  for (const r of nps) {
    const k = dayKey(r.inicioProgramado);
    if (!k) continue;
    const b = map.get(k) ?? { plan: 0, real: 0 };
    b.plan++;
    if (r.completada) b.real++;
    map.set(k, b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, label: dayLabel(dia), plan: v.plan, real: v.real }));
}

export function uniqueProgramadosDates(rows: WorkOrder[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const k = dayKey(r.inicioProgramado);
    if (k) set.add(k);
  }
  return Array.from(set).sort();
}
