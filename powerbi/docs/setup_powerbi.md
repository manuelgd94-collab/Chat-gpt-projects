# Setup en Power BI Desktop — paso a paso

Tiempo estimado: 30 min la primera vez.

## 0. Pre-requisitos

- Power BI Desktop (última versión).
- Credenciales de Maximo (`teck.maximo.com`) con permiso de lectura sobre el
  Object Structure `MXWO`.
- Estar conectado a la red corporativa Teck o VPN (la URL es on-premise).
- Conocer el **Site ID** del programa Puerto Pipeline. Pregunta a IT si no
  lo tienes — es un código corto (ej. `PUERTO`).

## 1. Crear el archivo

1. Power BI Desktop → **Archivo → Nuevo**.
2. **Archivo → Guardar como** → `Cumplimiento_Maximo.pbix` en la carpeta
   `powerbi/` del repo. NO subir el `.pbix` al repo (ya está en
   `.gitignore`).

## 2. Crear los 4 parámetros

`Inicio → Transformar datos → Administrar parámetros → Nuevo`. Crea uno
por uno:

| Nombre | Tipo | Valor por defecto |
|---|---|---|
| `MaximoBaseUrl` | Texto | `https://teck.maximo.com/maximo/oslc/os/mxwo` |
| `SiteID` | Texto | (tu site, ej. `PUERTO`) |
| `SemanaDesde` | Fecha | Lunes de tu semana actual |
| `SemanaHasta` | Fecha | Domingo de tu semana actual |

## 3. Crear las consultas

En el Editor de Power Query (`Inicio → Transformar datos`):

1. **Nueva consulta → Consulta en blanco**.
2. **Vista → Editor avanzado**.
3. Pega el contenido de `queries/02_MaximoOTs_API.pq`.
4. Renombra la consulta a `FactOTs`.
5. Cuando pida credenciales:
   - Tipo: **Básico**
   - Usuario: tu usuario Maximo
   - Contraseña: tu contraseña Maximo
   - Nivel: `https://teck.maximo.com/`
6. Repite con `03_Calendario.pq` → `DimCalendario`.
7. Repite con `04_DimDisciplina.pq` → `DimDisciplina`.
8. **Inicio → Cerrar y aplicar**.

## 4. Crear las relaciones

`Vista de modelo`:

- `FactOTs[DiaProgramado]` → `DimCalendario[Fecha]`
- `FactOTs[persongroup]` → `DimDisciplina[Grupo]`

Ambas: cardinalidad `*:1`, filtro unidireccional, activa.

## 5. Crear las medidas

`Vista de modelo` → click derecho en `FactOTs` → `Nueva medida`. Pega cada
fórmula de `measures/dax_measures.dax` una por una. Son ~25 medidas.

Atajo: en lugar de pegar una por una, abre **DAX Studio** (extensión
gratis), pega el bloque completo y úsalo para generar las medidas en
lote.

## 6. Crear la columna calculada DisciplinaFinal

`Vista de tabla` → tabla `FactOTs` → `Nueva columna`. Pega la fórmula del
bloque "8. Columna calculada" de `dax_measures.dax`.

## 7. Diseñar las páginas (sugerencia)

Réplica del dashboard web:

| Página | Visuales |
|---|---|
| **Resumen** | 5 KPI cards (`OTs Programadas`, `Cerradas`, `Pendientes`, `Atrasadas`, `% Cumplimiento`), gráfico línea Curva S, gráfico columnas Plan vs Real por día |
| **Especialidad** | Matriz Disciplina × Día con `% Cumplimiento` (color condicional con `[Color Semáforo (hex)]`), barras % por disciplina |
| **OTs Atrasadas** | Tabla con `wonum`, `description`, `status`, `schedstart`, filtrada por `[CategoriaEstado] = "Atrasadas por cierre"` |
| **OTs Incumplimiento** | Igual, filtrada por `[CategoriaEstado] = "Incumplimiento"` |
| **No Programadas** | Dos tablas: NP Finalizadas y NP en curso |
| **Listado** | Tabla completa con todos los campos + segmentación por `Programa`, `Disciplina`, `TipoMantenimiento` |

## 8. Publicar al servicio

1. **Archivo → Publicar → Mi área de trabajo**.
2. En `app.powerbi.com` → tu workspace → `Cumplimiento_Maximo` → **Configuración**:
   - **Credenciales del origen de datos**: actualizar con usuario Maximo.
   - **Gateway**: configurar gateway personal o corporativo (porque
     `teck.maximo.com` no es accesible desde internet público).
3. **Actualizar programado**: 1 vez al día a las 7:00 AM (después del
   primer turno).

## 9. Troubleshooting

| Error | Causa probable | Fix |
|---|---|---|
| `401 Unauthorized` | Credenciales incorrectas | Re-ingresar en "Editar credenciales" |
| `403 Forbidden` | Falta permiso sobre `MXWO` | Pedir a IT acceso al Object Structure |
| `Timeout` | Ventana de fechas demasiado grande | Reducir `SemanaDesde`/`SemanaHasta` |
| Vienen pocas filas | Filtro `SiteID` incorrecto | Confirmar Site ID con IT |
| `FactOTs` vacía | Usuario sin acceso al site | IT debe asignar Site al usuario |
| Refresh falla en servicio | Falta gateway | Instalar **Power BI Gateway** en una máquina con acceso a la red |
