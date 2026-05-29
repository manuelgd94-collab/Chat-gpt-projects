# Modelo semántico — Cumplimiento Maximo

Esquema en estrella. Una tabla de hechos `FactOTs` rodeada por dimensiones.

```
                ┌─────────────────┐
                │  DimCalendario  │
                │  (Fecha PK)     │
                └────────┬────────┘
                         │
                         │ Fecha = DiaProgramado
                         ▼
┌─────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│ DimDisciplina   │   │      FactOTs        │   │  DimPrograma     │
│ Grupo (PK)      │◄──┤  persongroup (FK)   │   │  Programa (PK)   │
│ Disciplina      │   │  DiaProgramado (FK) │──►│  (Pipeline,      │
└─────────────────┘   │  Programa (FK)      │   │   Puerto,        │
                      │  ...                │   │   Desaladora)    │
                      └─────────────────────┘   └──────────────────┘
                              │
                              │ TipoMantenimiento, CategoriaEstado,
                              ▼ status, worktype (columnas dimensión)
```

## Tablas

### FactOTs (hechos)

| Campo | Origen | Tipo | Descripción |
|---|---|---|---|
| wonum | OSLC | text | PK natural |
| description | OSLC | text | Descripción libre |
| status | OSLC | text | Ej. `70-COMP`, `80-CLOSE` |
| status_description | OSLC | text | Texto del estado |
| siteid | OSLC | text | Site Maximo |
| worktype | OSLC | text | PM / CM / EM / WR |
| wopriority | OSLC | int | Prioridad 1–5 |
| schedstart | OSLC | datetime | Inicio programado |
| schedfinish | OSLC | datetime | Fin programado |
| targstartdate | OSLC | datetime | Inicio previsto/objetivo |
| targcompdate | OSLC | datetime | Fin previsto |
| actstart | OSLC | datetime | Inicio real |
| actfinish | OSLC | datetime | Fin real |
| reportdate | OSLC | datetime | Fecha reporte |
| location | OSLC | text | Tag de ubicación |
| assetnum | OSLC | text | Activo |
| persongroup | OSLC | text | Grupo dueño (→ Disciplina) |
| classstructureid | OSLC | text | Clasificación |
| estdur | OSLC | number | Duración estimada (h) |
| actlabhrs | OSLC | number | Horas reales mano de obra |
| **DiaProgramado** | M | date | Date.From(schedstart) — relación a calendario |
| **DiaReal** | M | date | Date.From(actstart) |
| **Cerrada** | M | bool | status empieza con 70 u 80 |
| **Atrasada** | M | bool | schedstart < hoy AND !Cerrada |
| **TipoMantenimiento** | M | text | Preventivo / Correctivo / Solicitud / Otro |
| **Programa** | M | text | Pipeline / Puerto / Desaladora / Otros |
| **EstadoCorto** | M | text | Primeros 2 dígitos del status |
| **CategoriaEstado** | M | text | Incumplimiento / Atrasadas por cierre / Cerradas / Otros |
| **DisciplinaFinal** | DAX | text | Columna calculada usando DimDisciplina + heurística DCS |

### DimCalendario

Grano: día. Cubre `SemanaDesde - 1año` hasta `SemanaHasta + 1mes`.

Columnas: `Fecha`, `Año`, `MesNum`, `Mes`, `SemanaISO`, `Semana`, `DiaSemNum`, `DiaSem`, `EsHoy`.

### DimDisciplina

Tabla pequeña con mapeo exacto del Excel del usuario. Para grupos no
listados, la columna calculada `FactOTs[DisciplinaFinal]` aplica fallback
con `SEARCH("DCS", persongroup)` y por defecto `"Otros"`.

## Relaciones

| De | A | Cardinalidad | Dirección |
|---|---|---|---|
| FactOTs[DiaProgramado] | DimCalendario[Fecha] | * : 1 | unidireccional |
| FactOTs[persongroup] | DimDisciplina[Grupo] | * : 1 | unidireccional |

`Programa`, `TipoMantenimiento`, `CategoriaEstado`, `EstadoCorto` se usan
como dimensiones degeneradas dentro de FactOTs (no necesitan tabla
separada — son pocos valores y conviene mantenerlas in-fact para evitar
relaciones extra).

## Notas operativas

- **Filtro de seguridad:** la consulta OSLC SIEMPRE filtra por `siteid` y
  ventana de fechas en `schedstart`. Sin estos filtros traería los
  1.332.322 registros del sistema.
- **Paginación:** 1000 registros por página. Una semana del programa
  Puerto Pipeline cabe normalmente en 1–2 páginas.
- **Auth:** Basic auth con credenciales Maximo. Power BI las gestiona
  como "Credenciales de origen de datos" y las refresca al publicar al
  servicio.
- **Refresh en Power BI Service:** requiere **Gateway personal** o
  **estándar** porque `teck.maximo.com` es on-premise / red corporativa.
  No tiene IP pública para Power BI cloud.
