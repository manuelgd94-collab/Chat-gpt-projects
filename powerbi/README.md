# Power BI — Cumplimiento Maximo (Teck Puerto Pipeline)

Carpeta con las piezas necesarias para construir el `Cumplimiento_Maximo.pbix` en
Power BI Desktop, alimentado directamente desde la API OSLC de Maximo
(`https://teck.maximo.com/maximo/oslc/os/mxwo`).

Replica las reglas de negocio del dashboard web (`maximo-dashboard/`) — los
mismos KPIs, umbrales 85% / 70% y mapeo de disciplinas/áreas.

## Contenido

```
powerbi/
├── README.md                       ← este archivo
├── queries/
│   ├── 01_Parametros.pq            ← parámetros M (URL, sitio, fechas)
│   ├── 02_MaximoOTs_API.pq         ← consulta principal a OSLC con paginación
│   ├── 03_Calendario.pq            ← tabla de fechas
│   └── 04_DimDisciplina.pq         ← mapeo grupo → disciplina
├── measures/
│   └── dax_measures.dax            ← todas las medidas DAX listas para pegar
└── docs/
    ├── modelo.md                   ← esquema estrella, relaciones, granos
    └── setup_powerbi.md            ← pasos de montaje en Power BI Desktop
```

## Conexión a Maximo — autenticación

Maximo 7.6.1.3 confirmado. La API OSLC acepta **autenticación básica HTTP**
con tus credenciales normales de Maximo. No requiere API key.

En Power BI Desktop:

1. **Obtener datos → Web → Avanzado**.
2. Pega la URL base (`https://teck.maximo.com/maximo/oslc/os/mxwo`).
3. Cuando pida credenciales, elige **Básico** e ingresa
   `usuario:contraseña` de Maximo.
4. Nivel de aplicación: `https://teck.maximo.com/`.

Power BI guarda las credenciales encriptadas — **nunca quedan en los archivos
`.pq` que comiteamos**.

## KPIs implementados (paridad con dashboard web)

| KPI | Lógica |
|---|---|
| OTs programadas | `schedstart` no nulo en la semana |
| OTs cerradas | `status` en `70-COMP` o `80-CLOSE` |
| OTs pendientes | Programadas − Cerradas |
| OTs atrasadas | `schedstart < hoy` y no cerrada |
| % Cumplimiento | Cerradas / Programadas |
| % Adherencia | Día(`actstart`) = Día(`schedstart`) entre cerradas |
| Curva S Plan / Real | Acumulado diario / total semanal |
| PM Compliance | Cerradas PM / Programadas PM |
| Backlog | Programadas no cerradas con `schedstart ≤ hoy` |
| Edad backlog | Promedio de días desde `schedstart` |
| NP (Break-in) | OTs sin presencia en base semanal (flag desde dashboard) |

## Semáforo unificado

- 🟢 verde: ≥ 85%
- 🟡 amarillo: 70–84%
- 🔴 rojo: < 70%
