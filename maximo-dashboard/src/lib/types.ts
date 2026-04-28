export interface WorkOrder {
  orden: string;
  descripcion: string;
  ubicacion: string;
  inicioPrevisto: Date | null;
  inicioProgramado: Date | null;
  finalizacionPrevista: Date | null;
  estado: string;
  zonaTrabajo: string;
  grupoDueno: string;
  duracion: number | null;
  tipoOT: string;
  prioridad: string | number | null;
  planta: string;

  semana: string | null;
  area: Area;
  disciplina: string;
  completada: boolean;
  addedAfterBase?: boolean;
}

export type Area = 'Pipeline' | 'Puerto' | 'Desaladora' | 'Otros';

export interface Filters {
  semana: string | 'TODAS';
  area: Area | 'TODAS';
  programa: string | 'TODOS';
  disciplina: string | 'TODAS';
}

export interface KpiSummary {
  cumplimiento: number;
  adherencia: number;
  planCount: number;
  realCount: number;
  desviacion: number;
}

export interface DayBucket {
  dia: string;
  label: string;
  plan: number;
  real: number;
}

export interface MatrixCell {
  disciplina: string;
  dia: string;
  plan: number;
  real: number;
  pct: number;
}
