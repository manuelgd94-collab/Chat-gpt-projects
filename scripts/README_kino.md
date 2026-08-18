# Análisis de datos del Kino de la Suerte

Scripts para descargar el historial de sorteos del **Kino de la Suerte**
(Lotería de Concepción, Chile) y generar un informe estadístico descriptivo.

## Opción rápida: Google Colab

`kino_colab.ipynb` trae todo en un solo notebook (scraper + análisis) listo
para correr en [Google Colab](https://colab.research.google.com/), donde sí
hay acceso a internet:

1. Subí `kino_colab.ipynb` a Colab (Archivo → Subir notebook), o abrilo
   directo desde GitHub una vez que el branch esté en el repo
   (Archivo → Abrir notebook → GitHub → pegar la URL del repo).
2. Ejecutá las celdas en orden. La sección **"Paso 1 — Probar en una fecha
   conocida"** valida el scraper antes de lanzar la descarga completa.
3. Los gráficos y tablas se muestran inline; al final hay celdas opcionales
   para descargar el CSV y un .zip con el informe completo.

Los scripts `kino_scraper.py` / `analisis_kino.py` de abajo tienen la misma
lógica pero como CLI, para correr localmente en tu máquina.

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
