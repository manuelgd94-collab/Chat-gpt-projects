import type { Area } from './types';

const SEMANA_RE = /S\s*(\d{1,2})(?:[_\-\s](\d{2}))?/i;

export function deriveSemana(descripcion: string, fecha?: Date | null): string | null {
  if (descripcion) {
    const m = descripcion.match(SEMANA_RE);
    if (m) {
      const n = m[1].padStart(2, '0');
      const yy = m[2] ?? (fecha ? String(fecha.getFullYear() % 100).padStart(2, '0') : null);
      return yy ? `S${n}_${yy}` : `S${n}`;
    }
  }
  return semanaFromDate(fecha ?? null);
}

export function semanaFromDate(d: Date | null): string | null {
  if (!d) return null;
  const start = new Date(d.getFullYear(), 0, 1);
  const diffMs = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diffMs / 86400000);
  const week = Math.floor(dayOfYear / 7) + 1;
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `S${String(week).padStart(2, '0')}_${yy}`;
}

export function currentSemana(): string {
  return semanaFromDate(new Date()) as string;
}

const AREA_RE = /\b(PRT|PIP|PIPELINE|DESAL|DSL|PLNT|PLANT|PLANTA)\b/i;

export function deriveArea(descripcion: string, ubicacion: string): Area {
  const src = `${descripcion ?? ''} ${ubicacion ?? ''}`;
  const m = src.match(AREA_RE);
  if (!m) return 'OTRO';
  const tok = m[1].toUpperCase();
  if (tok === 'PIP' || tok === 'PIPELINE' || tok === 'PRT') return 'PIPELINE';
  if (tok === 'DESAL' || tok === 'DSL') return 'DESAL';
  if (tok === 'PLNT' || tok === 'PLANT' || tok === 'PLANTA') return 'PLANTA';
  return 'OTRO';
}

type DiscRule =
  | { kind: 'exact'; codes: string[]; label: string }
  | { kind: 'contains'; needle: string; label: string };

const DISC_RULES: DiscRule[] = [
  { kind: 'exact', codes: ['PLDMEC01', 'PLUMEC01', 'PTHMEC01', 'PTSMEC01', 'EXSALF02'], label: 'Mecánicos' },
  { kind: 'exact', codes: ['PLELE01', 'PTELE01', 'EXSALF04'], label: 'Eléctricos' },
  { kind: 'contains', needle: 'DCS', label: 'DCS' },
  { kind: 'exact', codes: ['PLINS01', 'PTINS01'], label: 'Instrumentista' },
  { kind: 'exact', codes: ['PPLUB02'], label: 'Lubricador' },
  { kind: 'exact', codes: ['EXPYC01', 'PPMON02', 'COMON01'], label: 'Moncon' },
];

export function deriveDisciplina(grupoDueno: string): string {
  const s = (grupoDueno ?? '').trim().toUpperCase();
  if (!s) return 'Otros';
  for (const rule of DISC_RULES) {
    if (rule.kind === 'exact' && rule.codes.includes(s)) return rule.label;
    if (rule.kind === 'contains' && s.includes(rule.needle)) return rule.label;
  }
  return 'Otros';
}

export function isCompletada(estado: string): boolean {
  return /^70/.test((estado ?? '').trim());
}

export function derivePrograma(wo: { descripcion: string; ubicacion: string }): string {
  const src = `${wo.descripcion ?? ''} ${wo.ubicacion ?? ''}`.toUpperCase();
  if (src.includes('PIPELINE') || src.includes('PIP') || src.includes('PRT')) return 'Puerto Pipeline';
  if (src.includes('DESAL')) return 'Desaladora';
  if (src.includes('PLANTA') || src.includes('PLANT') || src.includes('PLNT')) return 'Planta';
  return 'Otro';
}

export function dayKey(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
