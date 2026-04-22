# Chat-gpt-projects

Repositorio de documentación para el **Dashboard de cumplimiento semanal (Maximo ERP)**, optimizado para trabajar con **Claude Code**.

## Cómo usar con Claude Code

Este repositorio incluye un archivo `CLAUDE.md` en la raíz que Claude Code lee automáticamente al iniciar una sesión. Contiene todo el contexto del proyecto, convenciones y próximos pasos.

```bash
git clone https://github.com/manuelgd94-collab/Chat-gpt-projects.git
cd Chat-gpt-projects
# Claude Code leerá CLAUDE.md automáticamente
```

## Estructura

```
Chat-gpt-projects/
├── CLAUDE.md                        ← Instrucciones para Claude Code
├── README.md                        ← Este archivo
└── docs/
    ├── dashboard_maximo.md          ← Guía completa del dashboard (KPIs, arquitectura, flujo)
    └── revision_remota_excel.md     ← Protocolo de revisión remota sin adjuntar .xlsx
```

## Dashboard de cumplimiento semanal (Maximo ERP)

Guía completa para diseñar, revisar y operar un dashboard en Excel con actualización diaria desde Maximo ERP.

**Documento principal:** `docs/dashboard_maximo.md`

Incluye:
- Arquitectura del archivo Excel (hojas: PARAMETROS, BASE_OTS, CALCULOS_DIA, PIVOT_CUMPLIMIENTO, PIVOT_ADHERENCIA, CURVA_S, DASHBOARD, DICCIONARIO_ESTADOS)
- - KPIs clave: cumplimiento diario, adherencia y curva S
  - - Flujo operativo diario de actualización (Maximo → Power Query → Excel)
    - - Buenas prácticas de calidad de datos
      - - Auditoría práctica con hallazgos y plan de corrección
        - - Protocolo de revisión remota cuando no se puede adjuntar el .xlsx
         
          - ## Próximos pasos
         
          - - [ ] `scripts/` — Macro VBA para ActualizarTodo + timestamp
            - [ ] - [ ] `templates/` — Plantilla base `Dashboard_Cumplimiento_Semanal_TEMPLATE.xlsx`
            - [ ] - [ ] `docs/diccionario_estados.md` — Tabla de homologación de estados Maximo
            - [ ] - [ ] `docs/power_query_setup.md` — Pasos M para la consulta de carga diaria
            - [ ] 
