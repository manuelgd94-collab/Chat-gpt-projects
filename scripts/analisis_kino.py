#!/usr/bin/env python3
"""
analisis_kino.py — Genera un informe estadístico descriptivo a partir del CSV
histórico producido por kino_scraper.py.

Uso:
    python analisis_kino.py data/kino/kino_historico.csv \
        --out informe_kino.md --charts-dir charts_kino

Requisitos (ver scripts/requirements_kino.txt):
    pip install pandas matplotlib

⚠️ Nota estadística: cada sorteo del Kino es un evento independiente y
aleatorio. La frecuencia histórica de un número NO aumenta ni disminuye su
probabilidad en el próximo sorteo. Este informe es descriptivo (curiosidad /
exploración de datos), no un método de predicción.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import date
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # sin display, solo generar archivos PNG
import matplotlib.pyplot as plt
import pandas as pd

RANGO_NUMEROS = range(1, 26)  # 1..25
ORDEN_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

COLOR_FREQ = plt.cm.Blues
COLOR_ATRASO = plt.cm.Oranges
COLOR_BASE = "#3B6FA0"


def estilo_ejes(ax) -> None:
    """Aplica un estilo minimalista consistente a todos los gráficos:
    sin bordes superior/derecho, grilla horizontal tenue, ejes recesivos."""
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.grid(axis="x", color="#E3E3E3", linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)


def cargar_datos(ruta_csv: Path) -> pd.DataFrame:
    df = pd.read_csv(ruta_csv, dtype={"fecha": str})
    df["fecha"] = pd.to_datetime(df["fecha"])

    def parsear_numeros(fila) -> list[int]:
        if isinstance(fila.get("numeros"), str) and fila["numeros"]:
            return [int(n) for n in fila["numeros"].split(";")]
        cols_n = [c for c in df.columns if c.startswith("n_")]
        return [int(fila[c]) for c in cols_n if pd.notna(fila[c])]

    df["lista_numeros"] = df.apply(parsear_numeros, axis=1)
    antes = len(df)
    df = df[df["lista_numeros"].apply(len) == 14].copy()
    if len(df) < antes:
        print(f"⚠️  Se descartaron {antes - len(df)} filas con menos de 14 números.")

    df["suma"] = df["lista_numeros"].apply(sum)
    df["n_pares"] = df["lista_numeros"].apply(lambda ns: sum(1 for n in ns if n % 2 == 0))
    df["n_impares"] = 14 - df["n_pares"]
    df = df.sort_values("fecha").reset_index(drop=True)
    return df


# --------------------------------------------------------------------------
# 1. Frecuencia de números
# --------------------------------------------------------------------------

def analizar_frecuencia(df: pd.DataFrame, charts_dir: Path) -> tuple[pd.DataFrame, Path]:
    contador = Counter()
    for lista in df["lista_numeros"]:
        contador.update(lista)
    total_sorteos = len(df)

    tabla = pd.DataFrame(
        [(n, contador.get(n, 0)) for n in RANGO_NUMEROS],
        columns=["numero", "frecuencia"],
    )
    tabla["porcentaje"] = (tabla["frecuencia"] / total_sorteos * 100).round(1)
    tabla = tabla.sort_values("frecuencia", ascending=False).reset_index(drop=True)
    tabla.index += 1  # ranking 1-based

    tabla_grafico = tabla.sort_values("numero")
    fig, ax = plt.subplots(figsize=(10, 5))
    norm = plt.Normalize(tabla_grafico["frecuencia"].min(), tabla_grafico["frecuencia"].max())
    colores = COLOR_FREQ(0.35 + 0.55 * norm(tabla_grafico["frecuencia"]))
    ax.bar(tabla_grafico["numero"].astype(str), tabla_grafico["frecuencia"], color=colores, width=0.7)
    ax.set_title("Frecuencia por número — Kino (todo el período)", loc="left", fontsize=12, fontweight="bold")
    ax.set_xlabel("Número")
    ax.set_ylabel("Veces que salió")
    estilo_ejes(ax)
    ax.spines["bottom"].set_visible(False)
    fig.tight_layout()
    ruta = charts_dir / "frecuencia_numeros.png"
    fig.savefig(ruta, dpi=150)
    plt.close(fig)

    return tabla, ruta


# --------------------------------------------------------------------------
# 2. Patrones por día de sorteo
# --------------------------------------------------------------------------

def analizar_por_dia(df: pd.DataFrame, charts_dir: Path) -> tuple[pd.DataFrame, Path]:
    resumen = (
        df.groupby("dia_semana")
        .agg(sorteos=("fecha", "count"), suma_promedio=("suma", "mean"), pares_promedio=("n_pares", "mean"))
        .reindex(ORDEN_DIAS)
        .dropna(how="all")
    )
    resumen["suma_promedio"] = resumen["suma_promedio"].round(1)
    resumen["pares_promedio"] = resumen["pares_promedio"].round(1)

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar(resumen.index, resumen["suma_promedio"], color=COLOR_BASE, width=0.55)
    ax.set_title("Suma promedio de los 14 números, por día de sorteo", loc="left", fontsize=12, fontweight="bold")
    ax.set_ylabel("Suma promedio")
    estilo_ejes(ax)
    ax.spines["bottom"].set_visible(False)
    fig.tight_layout()
    ruta = charts_dir / "patrones_por_dia.png"
    fig.savefig(ruta, dpi=150)
    plt.close(fig)

    return resumen, ruta


# --------------------------------------------------------------------------
# 3. Números atrasados
# --------------------------------------------------------------------------

def analizar_atrasados(df: pd.DataFrame, charts_dir: Path) -> tuple[pd.DataFrame, Path]:
    total_sorteos = len(df)
    ultima_aparicion_idx: dict[int, int] = {}
    ultima_aparicion_fecha: dict[int, date] = {}

    for idx, fila in df.iterrows():
        for n in fila["lista_numeros"]:
            ultima_aparicion_idx[n] = idx
            ultima_aparicion_fecha[n] = fila["fecha"].date()

    filas = []
    for n in RANGO_NUMEROS:
        if n in ultima_aparicion_idx:
            atraso = (total_sorteos - 1) - ultima_aparicion_idx[n]
            ultima_fecha = ultima_aparicion_fecha[n]
        else:
            atraso = total_sorteos  # nunca salió en el período
            ultima_fecha = None
        filas.append((n, atraso, ultima_fecha))

    tabla = pd.DataFrame(filas, columns=["numero", "sorteos_sin_salir", "ultima_fecha"])
    tabla = tabla.sort_values("sorteos_sin_salir", ascending=False).reset_index(drop=True)
    tabla.index += 1

    top20 = tabla.head(20).sort_values("sorteos_sin_salir")
    fig, ax = plt.subplots(figsize=(8, 7))
    norm = plt.Normalize(top20["sorteos_sin_salir"].min(), top20["sorteos_sin_salir"].max())
    colores = COLOR_ATRASO(0.35 + 0.55 * norm(top20["sorteos_sin_salir"]))
    ax.barh(top20["numero"].astype(str), top20["sorteos_sin_salir"], color=colores, height=0.6)
    ax.set_title("Números más atrasados (top 20)", loc="left", fontsize=12, fontweight="bold")
    ax.set_xlabel("Sorteos consecutivos sin salir")
    ax.set_ylabel("Número")
    estilo_ejes(ax)
    ax.spines["left"].set_visible(False)
    fig.tight_layout()
    ruta = charts_dir / "numeros_atrasados.png"
    fig.savefig(ruta, dpi=150)
    plt.close(fig)

    return tabla, ruta


# --------------------------------------------------------------------------
# 4. Pares / impares y suma total
# --------------------------------------------------------------------------

def analizar_pares_impares(df: pd.DataFrame, charts_dir: Path) -> tuple[pd.Series, pd.Series, Path, Path]:
    dist_pares = df["n_pares"].value_counts().sort_index()
    stats_suma = df["suma"].describe().round(1)

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar(dist_pares.index.astype(str), dist_pares.values, color=COLOR_BASE, width=0.6)
    ax.set_title("Distribución: cantidad de números pares por sorteo", loc="left", fontsize=12, fontweight="bold")
    ax.set_xlabel("Cantidad de pares (de 14 números)")
    ax.set_ylabel("Sorteos")
    estilo_ejes(ax)
    ax.spines["bottom"].set_visible(False)
    fig.tight_layout()
    ruta_pares = charts_dir / "pares_impares.png"
    fig.savefig(ruta_pares, dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.hist(df["suma"], bins=20, color=COLOR_BASE, edgecolor="white")
    ax.axvline(df["suma"].mean(), color="#B23B3B", linewidth=2, linestyle="--", label=f"Media ({df['suma'].mean():.0f})")
    ax.set_title("Distribución de la suma de los 14 números ganadores", loc="left", fontsize=12, fontweight="bold")
    ax.set_xlabel("Suma")
    ax.set_ylabel("Sorteos")
    ax.legend(frameon=False)
    estilo_ejes(ax)
    ax.spines["bottom"].set_visible(False)
    fig.tight_layout()
    ruta_suma = charts_dir / "distribucion_suma.png"
    fig.savefig(ruta_suma, dpi=150)
    plt.close(fig)

    return dist_pares, stats_suma, ruta_pares, ruta_suma


# --------------------------------------------------------------------------
# Informe Markdown
# --------------------------------------------------------------------------

def tabla_md(df: pd.DataFrame) -> str:
    return df.to_markdown()


def generar_informe(df: pd.DataFrame, ruta_csv: Path, charts_dir: Path) -> str:
    tabla_freq, ruta_freq = analizar_frecuencia(df, charts_dir)
    tabla_dia, ruta_dia = analizar_por_dia(df, charts_dir)
    tabla_atraso, ruta_atraso = analizar_atrasados(df, charts_dir)
    dist_pares, stats_suma, ruta_pares, ruta_suma = analizar_pares_impares(df, charts_dir)

    desde = df["fecha"].min().date()
    hasta = df["fecha"].max().date()

    def rel(ruta: Path) -> str:
        return f"{charts_dir.name}/{ruta.name}"

    partes = []
    partes.append("# Informe de análisis — Kino de la Suerte\n")
    partes.append(
        f"**Período analizado:** {desde} a {hasta}  \n"
        f"**Sorteos incluidos:** {len(df)}  \n"
        f"**Fuente de datos:** `{ruta_csv}`  \n"
        f"**Generado:** {date.today().isoformat()}\n"
    )
    partes.append(
        "> ⚠️ **Nota:** cada sorteo del Kino es un evento independiente y "
        "aleatorio (14 números entre 1 y 25). La frecuencia histórica de un "
        "número no afecta su probabilidad en el próximo sorteo. Este informe "
        "es descriptivo, no predictivo.\n"
    )

    partes.append("## 1. Frecuencia de números\n")
    partes.append(f"![Frecuencia por número]({rel(ruta_freq)})\n")
    partes.append("**Top 10 más frecuentes:**\n")
    partes.append(tabla_md(tabla_freq.head(10)) + "\n")
    partes.append("**Top 10 menos frecuentes:**\n")
    partes.append(tabla_md(tabla_freq.tail(10).sort_values("frecuencia")) + "\n")

    partes.append("## 2. Patrones por día de sorteo\n")
    partes.append(f"![Patrones por día]({rel(ruta_dia)})\n")
    partes.append(tabla_md(tabla_dia) + "\n")

    partes.append("## 3. Números atrasados\n")
    partes.append(f"![Números atrasados]({rel(ruta_atraso)})\n")
    partes.append("**Top 10 con más sorteos sin salir:**\n")
    partes.append(tabla_md(tabla_atraso.head(10)) + "\n")

    partes.append("## 4. Pares/impares y suma total\n")
    partes.append(f"![Distribución pares/impares]({rel(ruta_pares)})\n")
    partes.append(f"![Distribución de la suma]({rel(ruta_suma)})\n")
    partes.append("**Distribución de cantidad de números pares por sorteo:**\n")
    partes.append(tabla_md(dist_pares.rename("sorteos").to_frame()) + "\n")
    partes.append("**Estadísticas de la suma de los 14 números:**\n")
    partes.append(tabla_md(stats_suma.rename("valor").to_frame()) + "\n")

    return "\n".join(partes)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera un informe estadístico del historial de Kino.")
    parser.add_argument("csv", type=Path, help="Ruta al CSV generado por kino_scraper.py.")
    parser.add_argument("--out", type=Path, default=Path("informe_kino.md"), help="Ruta del informe Markdown de salida.")
    parser.add_argument("--charts-dir", type=Path, default=Path("charts_kino"), help="Carpeta donde guardar los gráficos PNG.")
    args = parser.parse_args()

    if not args.csv.exists():
        parser.error(f"No se encontró el archivo {args.csv}")

    df = cargar_datos(args.csv)
    if df.empty:
        parser.error("El CSV no tiene filas válidas (con 14 números) para analizar.")

    args.charts_dir.mkdir(parents=True, exist_ok=True)
    informe = generar_informe(df, args.csv, args.charts_dir)

    args.out.write_text(informe, encoding="utf-8")
    print(f"✅ Informe generado en {args.out}")
    print(f"✅ Gráficos guardados en {args.charts_dir}/")


if __name__ == "__main__":
    main()
