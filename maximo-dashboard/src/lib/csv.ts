function escapeCsvField(v: unknown): string {
  if (v == null) return '';
  let s: string;
  if (v instanceof Date) {
    const dd = String(v.getDate()).padStart(2, '0');
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const yy = String(v.getFullYear() % 100).padStart(2, '0');
    s = `${dd}/${mm}/${yy}`;
  } else if (typeof v === 'number') {
    s = String(v);
  } else {
    s = String(v);
  }
  if (/[",\n;]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][], delimiter: string = ';'): string {
  const head = headers.map(escapeCsvField).join(delimiter);
  const body = rows.map((r) => r.map(escapeCsvField).join(delimiter)).join('\n');
  return head + '\n' + body;
}

export async function copyCsv(headers: string[], rows: unknown[][]): Promise<void> {
  const csv = toCsv(headers, rows);
  await navigator.clipboard.writeText(csv);
}
