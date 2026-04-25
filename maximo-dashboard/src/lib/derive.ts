import type { Area } from './types';

const SEMANA_RE = /S\s*(\d{1,2})(?:[_\-\s](\d{2}))?/i;

export function deriveSemana(descripcion: string): string | null {
  if (!descripcion) return null;
  const m = descripcion.match(SEMANA_RE);
  if (!m) return null;
  const n = m[1].padStart(2, '0');
  return m[2] ? `S${n}_${m[2]}` : `S${n}`;
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

const DISC_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /DCS/i, label: 'DCS' },
  { re: /MEC/i, label: 'Mecánicos' },
  { re: /LUB/i, label: 'Lubricador' },
  { re: /MON/i, label: 'Moncon' },
  { re: /ELE/i, label: 'Eléctricos' },
  { re: /INS/i, label: 'Instrumentista' },
  { re: /^P[LT]EL\d|^P[LT]EL$/i, label: 'Eléctricos' },
  { re: /^P[LT]IN\d|^P[LT]IN$/i, label: 'Instrumentista' },
];

export function deriveDisciplina(grupoDueno: string): string {
  const s = (grupoDueno ?? '').trim();
  if (!s) return 'Sin disciplina';

  for (const { re, label } of DISC_PATTERNS) {
    if (re.test(s)) return label;
  }

  const lower = s.toLowerCase();
  if (lower.includes('eléc') || lower.includes('elec')) return 'Eléctricos';
  if (lower.includes('inst')) return 'Instrumentista';
  if (lower.includes('mec')) return 'Mecánicos';
  if (lower.includes('lubric')) return 'Lubricador';
  if (lower.includes('moncon') || lower.includes('mon-con')) return 'Moncon';

  return s;
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
