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

interface SheetCandidate {
  name: string;
  sheet: XLSX.WorkSheet;
  matrix: unknown[][];
  headerRowIdx: number;
  score: number;
}

function readMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
}

function chooseBestSheet(wb: XLSX.WorkBook): SheetCandidate {
  if (wb.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas legibles. Posiblemente sea un .xls en formato HTML/XML no soportado — intenta abrirlo en Excel y guardarlo como .xlsx.');
  }

  for (const name of SHEET_CANDIDATES) {
    if (!wb.SheetNames.includes(name)) continue;
    const sheet = wb.Sheets[name];
    const matrix = readMatrix(sheet);
    const headerRowIdx = findHeaderRowIndex(matrix);
    const score = matrix[headerRowIdx] ? countMatchingHeaders(matrix[headerRowIdx]) : 0;
    if (score >= 8) return { name, sheet, matrix, headerRowIdx, score };
  }

  let best: SheetCandidate | null = null;
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const matrix = readMatrix(sheet);
    const headerRowIdx = findHeaderRowIndex(matrix);
    const score = matrix[headerRowIdx] ? countMatchingHeaders(matrix[headerRowIdx]) : 0;
    if (!best || score > best.score) {
      best = { name, sheet, matrix, headerRowIdx, score };
    }
  }
  return best!;
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
    const visible = headerRow.map((c) => String(c ?? '').trim()).filter(Boolean).join(' | ') || '(fila vacía)';
    throw new Error(`Faltan columnas en el Excel: ${missing.join(', ')}. Encabezados encontrados: ${visible}`);
  }
  return map as ColumnMap;
}

function countMatchingHeaders(row: unknown[]): number {
  const normalized = row.map((h) => normalizeHeader(String(h ?? '')));
  let hits = 0;
  for (const aliases of Object.values(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(normalizeHeader(alias))) {
        hits++;
        break;
      }
    }
  }
  return hits;
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  const limit = Math.min(matrix.length, 30);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < limit; i++) {
    const row = matrix[i];
    if (!row) continue;
    const score = countMatchingHeaders(row);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
    if (score >= 8) return i;
  }
  return bestIdx;
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

function buildDiagnostic(wb: XLSX.WorkBook, choice: SheetCandidate): string {
  const sheets = wb.SheetNames.map((n) => {
    const m = readMatrix(wb.Sheets[n]);
    const nonEmpty = m.filter((r) => r && r.some((c) => c != null && c !== '')).length;
    return `"${n}" (${nonEmpty} filas con datos)`;
  }).join(', ');

  const preview = choice.matrix
    .slice(0, 5)
    .map((row, i) => {
      const cells = (row ?? []).map((c) => String(c ?? '').trim()).filter(Boolean).slice(0, 6);
      return `  fila ${i + 1}: ${cells.join(' | ') || '(vacía)'}`;
    })
    .join('\n');

  return [
    `No pude detectar las columnas de Maximo en el archivo.`,
    `Hojas en el libro: ${sheets || '(ninguna)'}`,
    `Hoja elegida: "${choice.name}" (matches de encabezado: ${choice.score}/13)`,
    `Primeras filas:`,
    preview,
    `Sugerencias:`,
    `  • Si el .xls viene de Maximo, ábrelo en Excel y guárdalo como .xlsx.`,
    `  • Verifica que la primera hoja del libro tenga las columnas: Orden de trabajo, Descripción, Inicio previsto, Inicio programado, Estado, Grupo del dueño, etc.`,
  ].join('\n');
}

export async function parseWorkbook(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const choice = chooseBestSheet(wb);
  const { sheet, name: usedName, matrix, headerRowIdx, score } = choice;

  if (matrix.length < 2 || score === 0) {
    throw new Error(buildDiagnostic(wb, choice));
  }
  const header = matrix[headerRowIdx];
  const map = buildColumnMap(header);

  const rows: WorkOrder[] = [];
  let skipped = 0;
  void sheet;
  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
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
      area: deriveArea(descripcion, ubicacion, grupoDueno),
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
