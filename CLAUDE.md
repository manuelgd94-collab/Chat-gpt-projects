# CLAUDE.md — Instrucciones para Claude Code

Este archivo configura el comportamiento de Claude Code en este repositorio.

## Contexto del proyecto

**Repositorio:** `manuelgd94-collab/Chat-gpt-projects`
**Propósito:** Documentación y recursos para construir un dashboard semanal de cumplimiento de OTs (órdenes de trabajo) descargadas desde Maximo ERP, visualizado en Excel.

## Estructura del repositorio

```
Chat-gpt-projects/
├── CLAUDE.md                        ← Este archivo (instrucciones para Claude Code)
├── README.md                        ← Descripción general del repo
└── docs/
    ├── dashboard_maximo.md          ← Guía completa del dashboard (KPIs, arquitectura, flujo)
        └── revision_remota_excel.md     ← Protocolo de revisión remota sin adjuntar .xlsx
        ```

        ## Documento principal

        El documento de referencia es `docs/dashboard_maximo.md`. Contiene:

        1. Objetivo del dashboard
        2. Arquitectura recomendada del archivo Excel (hojas: PARAMETROS, BASE_OTS, CALCULOS_DIA, PIVOT_CUMPLIMIENTO, PIVOT_ADHERENCIA, CURVA_S, DASHBOARD, DICCIONARIO_ESTADOS)
        3. Estructura mínima de datos (campos de tbl_ots)
        4. Definiciones de KPIs: Cumplimiento diario, Adherencia diaria, Curva S
        5. Construcción de tablas dinámicas y visuales
        6. Flujo operativo diario (descarga Maximo → Power Query → actualización)
        7. Recomendaciones de automatización con Power Query
        8. Reglas de calidad de datos
        9. Auditoría del archivo existente (hallazgos y correcciones)
        10. Implementación mínima para actualización diaria sin errores
        11. Protocolos de revisión remota (opciones A/B/C/D)

        ## Comandos frecuentes para Claude Code

        ### Actualizar el dashboard
        Cuando el usuario pida "actualizar el dashboard" o "agregar sección X":
        - Editar `docs/dashboard_maximo.md`
        - Mantener la numeración de secciones existente
        - Agregar nuevas secciones al final o donde corresponda según el contexto

        ### Crear un nuevo documento
        Guardar siempre en `docs/` con nombre descriptivo en snake_case.

        ### Convenciones de escritura
        - Idioma: **español**
        - Formato: Markdown estándar
        - Fórmulas Excel: usar bloques de código o LaTeX según corresponda
        - Nunca usar inglés técnico donde haya equivalente en español claro

        ## KPIs clave del proyecto

        | KPI | Fórmula simplificada |
        |-----|---------------------|
        | Cumplimiento diario (%) | OTs ejecutadas del día / OTs planificadas del día × 100 |
        | Adherencia diaria (%) | Trabajo ejecutado según plan / Trabajo total ejecutado × 100 |
        | Curva S % Real | Σ Ejecutado días 1..n / Σ Plan semanal × 100 |
        | Curva S % Plan | Σ Plan días 1..n / Σ Plan semanal × 100 |

        ## Archivos Excel objetivo

        Archivo maestro: `Dashboard_Cumplimiento_Semanal.xlsx`
        Carpeta de datos diarios: `./data/maximo_diario/` (carga via Power Query)

        ## Notas importantes

        - Los datos provienen de **Maximo ERP** (sistema de gestión de activos).
        - El programa de referencia es **Puerto Pipeline**.
        - La actualización es **diaria** y debe hacerse sin vínculos externos rotos.
        - La base de datos principal es la tabla estructurada **tbl_ots** en la hoja BASE_OTS.
        - Los estados de Maximo a considerar: `32-WPCOND`, `55-SCH`, `60-INPRG`, `70-COMP`.

        ## Cómo trabajar con este repo en Claude Code

        1. Clona el repo: `git clone https://github.com/manuelgd94-collab/Chat-gpt-projects.git`
        2. El archivo principal a editar es `docs/dashboard_maximo.md`
        3. Para crear el dashboard en Excel, usa la guía de `docs/dashboard_maximo.md` como especificación
        4. Para generar scripts de automatización (VBA/Python), créalos en una carpeta `scripts/`
        5. Para plantillas Excel de referencia, créalas en una carpeta `templates/`

        ## Próximos pasos sugeridos

        - [ ] Crear carpeta `scripts/` con macro VBA para `ActualizarTodo` + timestamp
        - [ ] Crear carpeta `templates/` con plantilla base `Dashboard_Cumplimiento_Semanal_TEMPLATE.xlsx`
        - [ ] Crear `docs/diccionario_estados.md` con tabla de homologación de estados Maximo
        - [ ] Crear `docs/power_query_setup.md` con los pasos M para la consulta de carga diaria
        
