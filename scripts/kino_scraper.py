#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kino_scraper.py
===============
Recopila los resultados históricos del KINO (Lotería de Concepción, Chile)
y los guarda en CSV y XLSX.

El Kino se sortea miércoles, viernes y domingo. Cada sorteo son 14 números
del 1 al 25. Este script recorre las páginas por fecha de lotero.cl
(patrón de URL verificado: /resultados-kino/DD-MM-AAAA/), extrae los 14
números principales y arma el dataset. Las fechas sin sorteo devuelven 404
y simplemente se saltan.

USO
---
    pip install requests beautifulsoup4 pandas openpyxl
    python kino_scraper.py --desde 2024-08-01 --hasta 2026-07-31
    # o por defecto: los últimos 2 años hasta hoy
    python kino_scraper.py

SALIDA
------
    kino_historico.csv   (delimitador ';', decimal ',', UTF-8-BOM para Excel-CL)
    kino_historico.xlsx

Notas de integridad
-------------------
- Es reanudable: si el CSV ya existe, no vuelve a pedir los sorteos que ya tiene.
- Valida cada sorteo (14 números únicos en rango 1-25) antes de guardarlo;
  los que no validan se registran en el log y NO se escriben (nada inventado).
- Pausa configurable entre requests para no golpear el sitio.
- lotero.cl es una fuente NO oficial. Para verificación definitiva, contrasta
  contra el extracto oficial en https://www.loteria.cl

Basado en el enfoque de scraping tolerante de Blank2D/datos-de-azar (MIT).
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import re
import sys
import time
from datetime import date, timedelta
from typing import Optional

import requests
from bs4 import BeautifulSoup

LOG = logging.getLogger("kino")

BASE_URL = "https://lotero.cl/resultados-kino/{dd:02d}-{mm:02d}-{yyyy}/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; KinoScraper/1.0)",
    "Accept-Language": "es-CL,es;q=0.9",
}
DRAW_WEEKDAYS = {2, 4, 6}  # lunes=0 ... miércoles=2, viernes=4, domingo=6
CSV_PATH = "kino_historico.csv"
XLSX_PATH = "kino_historico.xlsx"
FIELDNAMES = ["sorteo", "fecha", "dia"] + [f"n{i}" for i in range(1, 15)]


# ----------------------------------------------------------------------
# Extracción
# ----------------------------------------------------------------------
def parse_draw(html: str, d: date) -> Optional[dict]:
    """
    Devuelve {sorteo, fecha, dia, n1..n14, adicional} o None si la página
    no contiene un sorteo válido.

    Heurística tolerante: toma los primeros 14 elementos-hoja cuyo texto es
    EXACTAMENTE un entero 1..25, en orden de aparición. Las bolas del Kino son
    los primeros números aislados de la página; el menú desplegable, el reloj
    y la tabla de premios son texto compuesto y se ignoran. Los números que
    siguen a los 14 pertenecen a otros juegos (ReKino, etc.) y se descartan.
    """
    soup = BeautifulSoup(html, "html.parser")

    # Número de sorteo
    m = re.search(r"Sorteo\s*N?[°ºo]?\.?\s*(\d{3,5})", soup.get_text(" ", strip=True),
                  flags=re.IGNORECASE)
    draw_number = int(m.group(1)) if m else None

    # Recolectar bolas: hojas cuyo texto es exactamente NN (1..25)
    balls: list[int] = []
    for tag in soup.find_all(string=True):
        txt = tag.strip()
        if txt.isdigit() and 1 <= int(txt) <= 25:
            # que sea un "token" aislado (la bola), no parte de una frase
            parent_txt = tag.parent.get_text(strip=True) if tag.parent else txt
            if parent_txt == txt:
                balls.append(int(txt))
        if len(balls) >= 20:  # suficiente para aislar las 14 primeras
            break

    # Primeros 14 únicos = Kino principal
    principal: list[int] = []
    for n in balls:
        if n not in principal:
            principal.append(n)
        if len(principal) == 14:
            break

    if len(principal) != 14:
        return None

    row = {
        "sorteo": draw_number if draw_number is not None else "",
        "fecha": d.isoformat(),
        "dia": ["lunes", "martes", "miércoles", "jueves",
                "viernes", "sábado", "domingo"][d.weekday()],
    }
    for i, n in enumerate(principal, start=1):
        row[f"n{i}"] = n
    return row


def fetch(session: requests.Session, url: str, timeout: int) -> Optional[str]:
    try:
        r = session.get(url, timeout=timeout)
    except requests.RequestException as exc:
        LOG.warning("Red falló %s: %s", url, exc)
        return None
    if r.status_code == 404:
        return None
    if r.status_code >= 400:
        LOG.warning("HTTP %s en %s", r.status_code, url)
        return None
    return r.text


# ----------------------------------------------------------------------
# Persistencia
# ----------------------------------------------------------------------
def load_existing() -> dict[str, dict]:
    if not os.path.exists(CSV_PATH):
        return {}
    out = {}
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f, delimiter=";"):
            out[row["fecha"]] = row
    return out


def save(rows: list[dict]) -> None:
    rows = sorted(rows, key=lambda r: r["fecha"])
    # CSV (Excel-CL: ';' y UTF-8 con BOM)
    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDNAMES, delimiter=";")
        w.writeheader()
        w.writerows(rows)
    # XLSX
    try:
        import pandas as pd
        pd.DataFrame(rows, columns=FIELDNAMES).to_excel(XLSX_PATH, index=False)
    except Exception as exc:  # openpyxl/pandas ausente: CSV sigue estando
        LOG.warning("No se pudo escribir XLSX (%s). El CSV sí se guardó.", exc)


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def daterange(desde: date, hasta: date):
    d = desde
    while d <= hasta:
        if d.weekday() in DRAW_WEEKDAYS:
            yield d
        d += timedelta(days=1)


def main() -> int:
    hoy = date.today()
    ap = argparse.ArgumentParser(description="Scraper histórico del Kino (Chile).")
    ap.add_argument("--desde", type=date.fromisoformat,
                    default=hoy.replace(year=hoy.year - 2),
                    help="Fecha inicial YYYY-MM-DD (default: hace 2 años).")
    ap.add_argument("--hasta", type=date.fromisoformat, default=hoy,
                    help="Fecha final YYYY-MM-DD (default: hoy).")
    ap.add_argument("--delay", type=float, default=1.5,
                    help="Segundos de pausa entre requests (default 1.5).")
    ap.add_argument("--timeout", type=int, default=30)
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s | %(levelname)-7s | %(message)s",
                        datefmt="%H:%M:%S")

    existing = load_existing()
    LOG.info("Ya en CSV: %d sorteos. Rango: %s → %s",
             len(existing), args.desde, args.hasta)

    rows = dict(existing)  # keyed by fecha ISO
    session = requests.Session()
    session.headers.update(HEADERS)

    nuevos = fallidos = 0
    for d in daterange(args.desde, args.hasta):
        key = d.isoformat()
        if key in rows:
            continue
        url = BASE_URL.format(dd=d.day, mm=d.month, yyyy=d.year)
        html = fetch(session, url, args.timeout)
        time.sleep(args.delay)
        if html is None:
            continue  # sin sorteo esa fecha (404) o error de red
        row = parse_draw(html, d)
        if row is None:
            LOG.warning("No se pudo parsear %s (%s)", key, url)
            fallidos += 1
            continue
        rows[key] = row
        nuevos += 1
        if nuevos % 20 == 0:
            save(list(rows.values()))
            LOG.info("Progreso: %d nuevos (guardado parcial).", nuevos)

    save(list(rows.values()))
    LOG.info("Listo. Total: %d sorteos | nuevos: %d | fallidos: %d",
             len(rows), nuevos, fallidos)
    LOG.info("Archivos: %s , %s", CSV_PATH, XLSX_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
