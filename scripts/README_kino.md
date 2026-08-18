# Análisis de datos del Kino de la Suerte

Dos scripts para descargar el historial de sorteos del **Kino de la Suerte**
(Lotería de Concepción, Chile) y generar un informe estadístico descriptivo.

## ⚠️ Antes de correrlos

`kino_scraper.py` fue escrito sin acceso directo a internet (el entorno de
Claude Code que lo generó tiene el egress de red bloqueado hacia loteria.cl),
por lo que **el parseo del HTML no está verificado contra el sitio real**.
Antes de lanzar la descarga completa:

```bash
python scripts/kino_scraper.py --test-fecha 2026-08-16
```

Si falla, el HTML se guarda en `debug/kino_<fecha>.html` para que lo
inspecciones en el navegador (clic derecho sobre un número ganador →
"Inspeccionar") y ajustes `URL_RESULTADOS` y `SELECTOR_NUMEROS` al inicio de
`kino_scraper.py`.

## Instalación

```bash
pip install -r scripts/requirements_kino.txt
```

## 1. Descargar el histórico

```bash
python scripts/kino_scraper.py --desde 2024-08-01 --hasta 2026-08-18 \
    --out data/kino/kino_historico.csv
```

- Solo descarga sorteos de **miércoles, viernes y domingo** (`--dias` para
  cambiarlo, ver `--help`).
- Reanudable: si se corta, correr el mismo comando de nuevo salta las fechas
  ya guardadas en el CSV.
- Las fechas que fallan quedan listadas en `data/kino/kino_historico.fallidas.txt`.

## 2. Generar el informe

```bash
python scripts/analisis_kino.py data/kino/kino_historico.csv \
    --out informe_kino.md --charts-dir charts_kino
```

Genera `informe_kino.md` con:

1. **Frecuencia de números** — ranking de más/menos frecuentes (1-25).
2. **Patrones por día de sorteo** — suma y cantidad de pares promedio por
   miércoles/viernes/domingo.
3. **Números atrasados** — cuántos sorteos lleva cada número sin salir.
4. **Pares/impares y suma total** — distribución de pares por sorteo y
   estadísticas de la suma de los 14 números.

Cada sección incluye un gráfico PNG en `charts_kino/`.

> Nota: cada sorteo es independiente y aleatorio — el informe es descriptivo,
> no predictivo.
