import * as XLSX from 'xlsx';
import type { WorkOrder } from './types';
import { deriveArea, deriveDisciplina, deriveSemana, isCompletada } from './derive';

const SHEET_CANDIDATES = [
  'Lista de Órdenes de trabajo1',
  'Lista de Órdenes de trabajo',
];

const COLUMN_ALIASES: Record<keyof ColumnMap, string[]> = {
  orden: ['Orden de trabajo', 'Orden Trabajo', 'OT'],
  descripcion: ['Descripción', 'Descripcion'],
  ubicacion: ['Ubicación', 'Ubicacion'],
  inicioPrevisto: ['Inicio previsto', 'Inicio Previsto'],
  inicioProgramado: ['Inicio programado', 'Inicio Programado'],
  finalizacionPrevista: ['Finalización prevista', 'Finalizacion prevista', 'Finalización Prevista'],
  estado: ['Estado'],
  zonaTrabajo: ['Zona de trabajo', 'Zona Trabajo'],
  grupoDueno: ['Grupo Dueño', 'Grupo del dueño', 'Grupo del Dueno', 'Grupo Dueno'],
  duracion: ['Duración', 'Duracion'],
  tipoOT: ['Tipo de Orden de Trabajo', 'Tipo OT'],
  prioridad: ['Prioridad'],
  planta: ['Planta'],
};

interface ColumnMap {
  orden: number;
  descripcion: number;
  ubicacion: number;
  inicioPrevisto: number;
  inicioProgramado: number;
  finalizacionPrevista: number;
  estado: number;
  zonaTrabajo: number;
  grupoDueno: number;
  duracion: number;
  tipoOT: number;
  prioridad: number;
  planta: number;
}

function findSheet(wb: XLSX.WorkBook): XLSX.WorkSheet {
  for (const name of SHEET_CANDIDATES) {
    if (wb.SheetNames.includes(name)) return wb.Sheets[name];
  }
  const normalized = wb.SheetNames.find((n) =>
    n.toLowerCase().replace(/\s+/g, ' ').startsWith('lista de órdenes de trabajo') ||
    n.toLowerCase().replace(/\s+/g, ' ').startsWith('lista de ordenes de trabajo'),
  );
  if (normalized) return wb.Sheets[normalized];
  if (wb.SheetNames.length > 0) {
    return wb.Sheets[wb.SheetNames[0]];
  }
  throw new Error(`Archivo Excel sin hojas. Esperaba "Lista de Órdenes de trabajo1" o cualquier hoja con las columnas Maximo.`);
}

function buildColumnMap(headerRow: unknown[]): ColumnMap {
  const normalizedHeaders = headerRow.map((h) => normalizeHeader(String(h ?? '')));
  const map: Partial<Record<keyof ColumnMap, number>> = {};
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ColumnMap, string[]][]) {
    for (const alias of aliases) {
      const idx = normalizedHeaders.indexOf(normalizeHeader(alias));
      if (idx !== -1) {
        map[key] = idx;
        break;
      }
    }
  }
  const missing = (Object.keys(COLUMN_ALIASES) as (keyof ColumnMap)[]).filter((k) => map[k] === undefined);
  if (missing.length) {
    throw new Error(`Faltan columnas en el Excel: ${missing.join(', ')}. Encabezados encontrados: ${headerRow.join(' | ')}`);
  }
  return map as ColumnMap;
}

function normalizeHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function parseExcelDate(v: unknown): Date | null {
  if (v == null || v === '') return null;

  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  if (typeof v === 'number' && isFinite(v)) {
    const parsed = XLSX.SSF?.parse_date_code
      ? XLSX.SSF.parse_date_code(v)
      : null;
    if (parsed) {
      const d = new Date(
        Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0)),
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const epoch = Date.UTC(1899, 11, 30);
    const ms = Math.round(v * 86400000);
    const d = new Date(epoch + ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;

    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10) - 1;
      let yy = parseInt(m[3], 10);
      if (yy < 100) yy += yy < 70 ? 2000 : 1900;
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      const se = m[6] ? parseInt(m[6], 10) : 0;
      const d = new Date(yy, mm, dd, h, mi, se);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export interface ParseResult {
  rows: WorkOrder[];
  sheetName: string;
  totalRows: number;
  skipped: number;
}

export async function parseWorkbook(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheet = findSheet(wb);
  const usedName = wb.SheetNames.find((n) => wb.Sheets[n] === sheet) ?? '';

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  if (matrix.length < 2) {
    return { rows: [], sheetName: usedName, totalRows: 0, skipped: 0 };
  }
  const header = matrix[0];
  const map = buildColumnMap(header);

  const rows: WorkOrder[] = [];
  let skipped = 0;
  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || r.every((c) => c == null || c === '')) {
      skipped++;
      continue;
    }
    const orden = String(r[map.orden] ?? '').trim();
    if (!orden) {
      skipped++;
      continue;
    }
    const descripcion = String(r[map.descripcion] ?? '').trim();
    const grupoDueno = String(r[map.grupoDueno] ?? '').trim();
    const estado = String(r[map.estado] ?? '').trim();
    const ubicacion = String(r[map.ubicacion] ?? '').trim();
    const inicioPrevisto = parseExcelDate(r[map.inicioPrevisto]);
    const inicioProgramado = parseExcelDate(r[map.inicioProgramado]);

    const wo: WorkOrder = {
      orden,
      descripcion,
      ubicacion,
      inicioPrevisto,
      inicioProgramado,
      finalizacionPrevista: parseExcelDate(r[map.finalizacionPrevista]),
      estado,
      zonaTrabajo: String(r[map.zonaTrabajo] ?? '').trim(),
      grupoDueno,
      duracion: toNumber(r[map.duracion]),
      tipoOT: String(r[map.tipoOT] ?? '').trim(),
      prioridad: normalizePrioridad(r[map.prioridad]),
      planta: String(r[map.planta] ?? '').trim(),

      semana: deriveSemana(descripcion, inicioProgramado ?? inicioPrevisto),
      area: deriveArea(descripcion, ubicacion),
      disciplina: deriveDisciplina(grupoDueno),
      completada: isCompletada(estado),
    };
    rows.push(wo);
  }

  return { rows, sheetName: usedName, totalRows: matrix.length - 1, skipped };
}

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const n = Number(String(v).replace(',', '.'));
  return isFinite(n) ? n : null;
}

function normalizePrioridad(v: unknown): string | number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  return String(v).trim();
}
