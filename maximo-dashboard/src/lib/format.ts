const NF = new Intl.NumberFormat('es', { maximumFractionDigits: 0 });

export function fmtInt(n: number): string {
  return NF.format(n);
}

export function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}
