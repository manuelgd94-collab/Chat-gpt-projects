#!/usr/bin/env python3
"""
kino_scraper.py — Descarga el historial de resultados del Kino de la Suerte
(Lotería de Concepción, Chile) desde la web oficial y lo guarda en un CSV.

⚠️ IMPORTANTE — LEER ANTES DE USAR
-----------------------------------
Este script fue escrito SIN acceso directo a internet (el entorno donde se
generó tiene el egress de red bloqueado), por lo que la función
`parsear_resultado()` es un punto de partida razonable, NO un scraper
verificado contra el HTML real de loteria.cl. Antes de correr el histórico
completo:

    1. Ejecuta primero en modo de prueba sobre una sola fecha conocida:
           python kino_scraper.py --test-fecha 2026-08-16
    2. Si falla el parseo, se guardará el HTML crudo en debug/ para que
       puedas inspeccionarlo (clic derecho → "Inspeccionar" en el navegador
       sobre un número ganador) y ajustar SELECTOR_NUMEROS más abajo.
    3. Una vez que --test-fecha funcione, corre el rango completo.

Uso:
    python kino_scraper.py --desde 2024-08-01 --hasta 2026-08-18 \
        --out data/kino/kino_historico.csv

    # Modo de prueba de un solo sorteo:
    python kino_scraper.py --test-fecha 2026-08-16

Requisitos (ver scripts/requirements_kino.txt):
    pip install requests beautifulsoup4
"""

from __future__ import annotations

import argparse
import csv
import logging
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

# --------------------------------------------------------------------------
# CONFIGURACIÓN — ajustar aquí si el sitio real tiene otra estructura
# --------------------------------------------------------------------------

# URL de resultados por fecha. AJUSTAR según la estructura real del sitio:
# abre https://www.loteria.cl/ , busca "resultados anteriores" o "histórico
# de sorteos", elige una fecha y copia el patrón de URL que use.
URL_RESULTADOS = "https://www.loteria.cl/resultados/kino?fecha={fecha}"

# Selector CSS de cada "bolita"/número ganador dentro de la página de
# resultados. AJUSTAR tras inspeccionar el HTML real (DevTools → Elements).
SELECTOR_NUMEROS = ".resultado-kino .bolita, .numeros-ganadores li"

# Días de la semana en que hay sorteo de Kino (miércoles, viernes, domingo).
# 0 = lunes … 6 = domingo (convención de `date.weekday()`).
DIAS_SORTEO_DEFECTO = {2, 4, 6}  # miércoles, viernes, domingo
NOMBRE_DIA = {
    0: "lunes", 1: "martes", 2: "miércoles", 3: "jueves",
    4: "viernes", 5: "sábado", 6: "domingo",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; kino-scraper/1.0; "
        "uso personal de análisis histórico)"
    )
}

CANTIDAD_NUMEROS_KINO = 14
RANGO_NUMEROS_KINO = (1, 25)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("kino_scraper")


@dataclass
class ResultadoSorteo:
    fecha: date
    numeros: list[int]
    numero_sorteo: Optional[str] = None

    def to_row(self) -> dict:
        numeros_ordenados = sorted(self.numeros)
        fila = {
            "fecha": self.fecha.isoformat(),
            "dia_semana": NOMBRE_DIA[self.fecha.weekday()],
            "numero_sorteo": self.numero_sorteo or "",
            "numeros": ";".join(str(n) for n in numeros_ordenados),
        }
        for i, n in enumerate(numeros_ordenados, start=1):
            fila[f"n_{i}"] = n
        return fila


def descargar_html(fecha: date, sesion: requests.Session, reintentos: int = 4) -> Optional[str]:
    """Descarga el HTML de la página de resultados para una fecha, con
    reintentos y backoff exponencial (2s, 4s, 8s, 16s) ante errores de red."""
    url = URL_RESULTADOS.format(fecha=fecha.isoformat())
    espera = 2
    for intento in range(1, reintentos + 1):
        try:
            resp = sesion.get(url, headers=HEADERS, timeout=20)
            if resp.status_code == 404:
                log.warning("Sin resultados publicados para %s (404).", fecha)
                return None
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as e:
            log.warning(
                "Intento %d/%d falló para %s: %s", intento, reintentos, fecha, e
            )
            if intento == reintentos:
                log.error("Se agotaron los reintentos para %s.", fecha)
                return None
            time.sleep(espera)
            espera *= 2
    return None


def parsear_resultado(html: str, fecha: date) -> Optional[ResultadoSorteo]:
    """Extrae los 14 números ganadores del HTML de la página de resultados.

    ⚠️ Selector best-effort — ajustar SELECTOR_NUMEROS si no coincide con el
    HTML real del sitio (ver cabecera del archivo).
    """
    soup = BeautifulSoup(html, "html.parser")
    elementos = soup.select(SELECTOR_NUMEROS)

    numeros: list[int] = []
    for el in elementos:
        texto = el.get_text(strip=True)
        if texto.isdigit():
            numeros.append(int(texto))

    if len(numeros) < CANTIDAD_NUMEROS_KINO:
        log.warning(
            "Solo se encontraron %d/%d números para %s — revisar SELECTOR_NUMEROS.",
            len(numeros), CANTIDAD_NUMEROS_KINO, fecha,
        )
        return None

    # Si el selector capturó de más (ej. otros juegos en la misma página),
    # nos quedamos con los primeros 14 encontrados.
    numeros = numeros[:CANTIDAD_NUMEROS_KINO]

    lo, hi = RANGO_NUMEROS_KINO
    if not all(lo <= n <= hi for n in numeros):
        log.warning("Números fuera de rango (%d-%d) para %s: %s", lo, hi, fecha, numeros)
        return None

    return ResultadoSorteo(fecha=fecha, numeros=numeros)


def guardar_html_debug(html: str, fecha: date) -> None:
    carpeta = Path("debug")
    carpeta.mkdir(exist_ok=True)
    destino = carpeta / f"kino_{fecha.isoformat()}.html"
    destino.write_text(html, encoding="utf-8")
    log.info("HTML guardado para inspección en %s", destino)


def fechas_sorteo(desde: date, hasta: date, dias_sorteo: set[int]) -> list[date]:
    fechas = []
    actual = desde
    while actual <= hasta:
        if actual.weekday() in dias_sorteo:
            fechas.append(actual)
        actual += timedelta(days=1)
    return fechas


def cargar_fechas_existentes(ruta_csv: Path) -> set[str]:
    if not ruta_csv.exists():
        return set()
    with ruta_csv.open(newline="", encoding="utf-8") as f:
        return {fila["fecha"] for fila in csv.DictReader(f)}


CAMPOS_CSV = ["fecha", "dia_semana", "numero_sorteo", "numeros"] + [
    f"n_{i}" for i in range(1, CANTIDAD_NUMEROS_KINO + 1)
]


def escribir_fila(ruta_csv: Path, fila: dict, escribir_encabezado: bool) -> None:
    with ruta_csv.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CAMPOS_CSV)
        if escribir_encabezado:
            writer.writeheader()
        writer.writerow(fila)


def correr_scraper(
    desde: date, hasta: date, ruta_out: Path, dias_sorteo: set[int], pausa: float
) -> None:
    ruta_out.parent.mkdir(parents=True, exist_ok=True)
    ya_procesadas = cargar_fechas_existentes(ruta_out)
    escribir_encabezado = not ruta_out.exists() or ruta_out.stat().st_size == 0

    todas = fechas_sorteo(desde, hasta, dias_sorteo)
    pendientes = [f for f in todas if f.isoformat() not in ya_procesadas]

    log.info(
        "Rango %s → %s: %d fechas de sorteo, %d ya en %s, %d por descargar.",
        desde, hasta, len(todas), len(ya_procesadas), ruta_out, len(pendientes),
    )

    fallidas: list[str] = []
    sesion = requests.Session()

    for i, fecha in enumerate(pendientes, start=1):
        log.info("[%d/%d] Descargando sorteo del %s (%s)...", i, len(pendientes), fecha, NOMBRE_DIA[fecha.weekday()])
        html = descargar_html(fecha, sesion)
        if html is None:
            fallidas.append(fecha.isoformat())
            continue

        resultado = parsear_resultado(html, fecha)
        if resultado is None:
            guardar_html_debug(html, fecha)
            fallidas.append(fecha.isoformat())
            continue

        escribir_fila(ruta_out, resultado.to_row(), escribir_encabezado)
        escribir_encabezado = False
        log.info("  → %s", ";".join(str(n) for n in sorted(resultado.numeros)))

        time.sleep(pausa)  # pausa cortés entre requests para no sobrecargar el sitio

    log.info("Listo. %d sorteos guardados en %s.", len(pendientes) - len(fallidas), ruta_out)
    if fallidas:
        ruta_fallidas = ruta_out.with_suffix(".fallidas.txt")
        ruta_fallidas.write_text("\n".join(fallidas), encoding="utf-8")
        log.warning(
            "%d fechas fallaron y quedaron listadas en %s. Podés reintentarlas "
            "corriendo el script de nuevo (se saltan las ya descargadas).",
            len(fallidas), ruta_fallidas,
        )


def correr_test(fecha_str: str) -> None:
    fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    log.info("Modo prueba: descargando sorteo del %s...", fecha)
    sesion = requests.Session()
    html = descargar_html(fecha, sesion)
    if html is None:
        log.error("No se pudo descargar el HTML. Revisar URL_RESULTADOS.")
        sys.exit(1)

    resultado = parsear_resultado(html, fecha)
    if resultado is None:
        guardar_html_debug(html, fecha)
        log.error(
            "No se pudieron extraer los 14 números. Revisá el HTML guardado en "
            "debug/ e inspeccionalo en el navegador para ajustar SELECTOR_NUMEROS."
        )
        sys.exit(1)

    log.info("✅ Parseo exitoso: %s", sorted(resultado.numeros))
    print("\nResultado:", resultado.to_row())


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Descarga el historial de resultados del Kino de la Suerte."
    )
    parser.add_argument("--desde", help="Fecha inicial (YYYY-MM-DD).")
    parser.add_argument(
        "--hasta", default=date.today().isoformat(), help="Fecha final (YYYY-MM-DD). Por defecto hoy."
    )
    parser.add_argument(
        "--out", default="data/kino/kino_historico.csv", help="Ruta del CSV de salida."
    )
    parser.add_argument(
        "--pausa", type=float, default=1.5, help="Segundos de espera entre requests (defecto 1.5)."
    )
    parser.add_argument(
        "--dias",
        default="mie,vie,dom",
        help="Días de sorteo separados por coma (lun,mar,mie,jue,vie,sab,dom). Defecto: mie,vie,dom.",
    )
    parser.add_argument(
        "--test-fecha",
        help="Modo de prueba: descarga y parsea una sola fecha (YYYY-MM-DD) para validar el scraper.",
    )
    args = parser.parse_args()

    if args.test_fecha:
        correr_test(args.test_fecha)
        return

    if not args.desde:
        parser.error("--desde es obligatorio (salvo en modo --test-fecha).")

    mapa_dias = {"lun": 0, "mar": 1, "mie": 2, "jue": 3, "vie": 4, "sab": 5, "dom": 6}
    try:
        dias_sorteo = {mapa_dias[d.strip()] for d in args.dias.split(",")}
    except KeyError as e:
        parser.error(f"Día inválido en --dias: {e}. Usar: lun,mar,mie,jue,vie,sab,dom.")

    desde = datetime.strptime(args.desde, "%Y-%m-%d").date()
    hasta = datetime.strptime(args.hasta, "%Y-%m-%d").date()
    if desde > hasta:
        parser.error("--desde no puede ser posterior a --hasta.")

    correr_scraper(desde, hasta, Path(args.out), dias_sorteo, args.pausa)


if __name__ == "__main__":
    main()
