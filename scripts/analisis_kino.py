#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analisis_kino.py
================
Análisis estadístico de resultados históricos del KINO (Chile).

Toma el CSV generado por kino_scraper.py (columnas: sorteo, fecha, dia,
n1..n14) y produce un informe con probabilidad empírica por número,
test chi-cuadrado de uniformidad, distribución de sumas, paridad,
alto/bajo y pares más frecuentes. Puede filtrar por día de la semana.

USO
---
    pip install pandas numpy scipy
    python analisis_kino.py                      # todos los sorteos
    python analisis_kino.py --dia miércoles      # solo un día
    python analisis_kino.py --csv otro.csv --out informe.txt

QUÉ CALCULA (y qué significa)
-----------------------------
- Probabilidad empírica p_i = (veces que salió i) / (nº de sorteos).
  El valor teórico si el bombo es justo es 14/25 = 0.56 para TODO número.
- Intervalo de confianza 95% (Wilson) para cada p_i: si el 0.56 cae dentro,
  ese número NO se desvía significativamente de lo esperado.
- Chi-cuadrado de bondad de ajuste sobre el conteo total de apariciones
  contra la frecuencia uniforme esperada. H0: el sorteo es uniforme (justo).
  p-valor alto (> 0.05) => no hay evidencia de sesgo.

ADVERTENCIA ESTADÍSTICA
-----------------------
Cada sorteo es independiente. Nada de esto predice el próximo resultado
ni mejora las chances para un día puntual: describe el comportamiento
pasado y detecta sesgos físicos si existieran. La probabilidad de acertar
los 14 es 1 en C(25,14) = 4.457.400, salga el día que salga.
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from itertools import combinations
from math import comb, sqrt

import numpy as np
import pandas as pd

try:
    from scipy.stats import chisquare
    HAVE_SCIPY = True
except Exception:
    HAVE_SCIPY = False

UNIVERSO = 25          # números del 1 al 25
ELEGIDOS = 14          # se sortean 14
P_TEORICA = ELEGIDOS / UNIVERSO  # 0.56
NUM_COLS = [f"n{i}" for i in range(1, 15)]


def cargar(csv_path: str, dia: str | None) -> pd.DataFrame:
    # Autodetecta separador (el scraper usa ';'); UTF-8-BOM tolerante.
    df = pd.read_csv(csv_path, sep=None, engine="python", encoding="utf-8-sig")
    df.columns = [c.strip().lower() for c in df.columns]
    faltan = [c for c in NUM_COLS if c not in df.columns]
    if faltan:
        sys.exit(f"El CSV no tiene las columnas {faltan}. ¿Es la salida de kino_scraper.py?")
    if dia:
        if "dia" not in df.columns:
            sys.exit("El CSV no tiene columna 'dia' para filtrar.")
        d = _norm(dia)
        df = df[df["dia"].map(_norm) == d]
        if df.empty:
            sys.exit(f"No hay sorteos para el día '{dia}'.")
    # Validación: cada fila debe traer 14 enteros únicos en 1..25
    ok = df[NUM_COLS].apply(_fila_valida, axis=1)
    if (~ok).any():
        print(f"[aviso] {(~ok).sum()} filas inválidas descartadas.", file=sys.stderr)
        df = df[ok]
    return df.reset_index(drop=True)


def _norm(s: str) -> str:
    s = str(s).strip().lower()
    for a, b in zip("áéíóú", "aeiou"):
        s = s.replace(a, b)
    return s


def _fila_valida(row) -> bool:
    try:
        v = [int(x) for x in row]
    except (ValueError, TypeError):
        return False
    return len(v) == ELEGIDOS and len(set(v)) == ELEGIDOS and all(1 <= x <= UNIVERSO for x in v)


def wilson_ci(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """Intervalo de confianza de Wilson para una proporción."""
    if n == 0:
        return (0.0, 0.0)
    phat = k / n
    denom = 1 + z**2 / n
    centro = (phat + z**2 / (2 * n)) / denom
    margen = (z * sqrt(phat * (1 - phat) / n + z**2 / (4 * n**2))) / denom
    return (max(0.0, centro - margen), min(1.0, centro + margen))


def analizar(df: pd.DataFrame) -> list[str]:
    N = len(df)
    L: list[str] = []
    add = L.append

    add("=" * 64)
    add("ANÁLISIS ESTADÍSTICO DEL KINO")
    add("=" * 64)
    add(f"Sorteos analizados : {N}")
    if "fecha" in df.columns:
        add(f"Rango de fechas    : {df['fecha'].min()} → {df['fecha'].max()}")
    add(f"Números por sorteo : {ELEGIDOS} de {UNIVERSO}")
    add(f"Prob. teórica p/nº : {P_TEORICA:.4f} (14/25) si el bombo es justo")
    add("")

    # --- Frecuencia y probabilidad empírica ---
    todos = df[NUM_COLS].to_numpy().ravel()
    cont = Counter(int(x) for x in todos)
    add("-" * 64)
    add("FRECUENCIA Y PROBABILIDAD EMPÍRICA POR NÚMERO")
    add("-" * 64)
    add(f"{'Nº':>3} {'veces':>6} {'p_emp':>7} {'IC95%':>17} {'vs 0.56':>9}")
    counts = np.zeros(UNIVERSO, dtype=int)
    for i in range(1, UNIVERSO + 1):
        k = cont.get(i, 0)
        counts[i - 1] = k
        p = k / N if N else 0.0
        lo, hi = wilson_ci(k, N)
        dentro = lo <= P_TEORICA <= hi
        marca = "ok" if dentro else "**"  # ** = fuera del IC (posible desvío)
        add(f"{i:>3} {k:>6} {p:>7.3f}  [{lo:>5.3f},{hi:>5.3f}] {marca:>7}")
    add("")
    add("  'ok' = el 0.56 teórico cae dentro del IC (sin desvío significativo).")
    add("  '**' = el número se desvía del valor esperado a 95% de confianza.")
    add("")

    # --- Chi-cuadrado de uniformidad ---
    add("-" * 64)
    add("TEST CHI-CUADRADO DE UNIFORMIDAD")
    add("-" * 64)
    esperado = counts.sum() / UNIVERSO
    if HAVE_SCIPY and esperado >= 5:
        chi2, pval = chisquare(counts, f_exp=np.full(UNIVERSO, esperado))
        add(f"H0: todos los números son igualmente probables (sorteo justo).")
        add(f"chi2 = {chi2:.2f} | gl = {UNIVERSO-1} | p-valor = {pval:.4f}")
        if pval > 0.05:
            add("=> p > 0.05: NO hay evidencia de sesgo. Consistente con un juego justo.")
        else:
            add("=> p <= 0.05: hay desvío significativo respecto de lo uniforme.")
            add("   (Revisar si es real o efecto de muestra; no implica predictibilidad.)")
    else:
        chi2 = float(((counts - esperado) ** 2 / esperado).sum())
        add(f"chi2 = {chi2:.2f} | gl = {UNIVERSO-1} (instala scipy para el p-valor)")
        if esperado < 5:
            add("   (Muestra chica: esperado < 5 por celda; test poco fiable aún.)")
    add(f"  Apariciones esperadas por número: {esperado:.1f}")
    add("")

    # --- Números más y menos frecuentes ---
    orden = sorted(range(1, UNIVERSO + 1), key=lambda i: cont.get(i, 0), reverse=True)
    add("-" * 64)
    add("MÁS Y MENOS FRECUENTES (descriptivo; NO son 'los que vienen')")
    add("-" * 64)
    add("  Top 5 : " + ", ".join(f"{i}({cont.get(i,0)})" for i in orden[:5]))
    add("  Bot 5 : " + ", ".join(f"{i}({cont.get(i,0)})" for i in orden[-5:]))
    add("")

    # --- Suma, paridad, alto/bajo por sorteo ---
    sumas = df[NUM_COLS].sum(axis=1).to_numpy()
    pares = df[NUM_COLS].apply(lambda r: sum(int(x) % 2 == 0 for x in r), axis=1).to_numpy()
    altos = df[NUM_COLS].apply(lambda r: sum(int(x) >= 13 for x in r), axis=1).to_numpy()
    add("-" * 64)
    add("ESTRUCTURA DE CADA SORTEO")
    add("-" * 64)
    add(f"  Suma de los 14 nº : media {sumas.mean():.1f} | min {sumas.min()} | "
        f"max {sumas.max()} | desv {sumas.std(ddof=1) if N>1 else 0:.1f}")
    add(f"  Nº pares (de 14)  : media {pares.mean():.1f}  (12 pares posibles: 2..24)")
    add(f"  Nº altos (>=13)   : media {altos.mean():.1f}  (13 altos posibles: 13..25)")
    add("")

    # --- Pares de números que más coinciden ---
    par_cont: Counter = Counter()
    for _, row in df[NUM_COLS].iterrows():
        nums = sorted(int(x) for x in row)
        par_cont.update(combinations(nums, 2))
    add("-" * 64)
    add("PARES QUE MÁS COINCIDEN EN UN MISMO SORTEO")
    add("-" * 64)
    if par_cont:
        esp_par = N * (comb(ELEGIDOS, 2) / comb(UNIVERSO, 2))  # esperado si independiente
        for (a, b), c in par_cont.most_common(10):
            add(f"  {a:>2}-{b:<2} : {c} veces   (esperado ~{esp_par:.1f} si fuera azar puro)")
    add("")

    add("=" * 64)
    add("NOTA: cada sorteo es independiente. Este informe DESCRIBE el pasado y")
    add("detecta sesgos si existen; no predice el próximo sorteo ni mejora las")
    add("chances para un día puntual. Acertar 14: 1 en 4.457.400.")
    add("=" * 64)
    return L


def main() -> int:
    ap = argparse.ArgumentParser(description="Análisis estadístico del Kino.")
    ap.add_argument("--csv", default="kino_historico.csv", help="CSV de kino_scraper.py")
    ap.add_argument("--dia", default=None,
                    help="Filtra por día: miércoles, viernes o domingo.")
    ap.add_argument("--out", default=None, help="Guardar informe en archivo .txt")
    args = ap.parse_args()

    df = cargar(args.csv, args.dia)
    lineas = analizar(df)
    texto = "\n".join(lineas)
    print(texto)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(texto + "\n")
        print(f"\n[informe guardado en {args.out}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
