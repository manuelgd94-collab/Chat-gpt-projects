# Dashboard semanal de cumplimiento (Maximo ERP + Excel)

## 1) Objetivo
Construir un dashboard en Excel para monitorear **cumplimiento semanal** de OTs (órdenes de trabajo) descargadas desde Maximo ERP para programas de Puerto Pipeline, con actualización diaria.

---

## 2) Arquitectura recomendada del archivo
Usa un solo archivo maestro: `Dashboard_Cumplimiento_Semanal.xlsx` con estas hojas:

1. **PARAMETROS**
   - Semana actual (año, semana ISO)
   - Fecha inicio semana
   - Fecha fin semana
   - Meta semanal por área (%)

2. **BASE_OTS**
   - Tabla estructurada (`tbl_ots`) con datos crudos de Maximo ERP.
   - Esta hoja no debe tener cálculos manuales.

3. **CALCULOS_DIA**
   - Campos auxiliares para KPIs diarios/semanales.

4. **PIVOT_CUMPLIMIENTO**
   - Tabla dinámica para cumplimiento diario.

5. **PIVOT_ADHERENCIA**
   - Tabla dinámica para adherencia diaria.

6. **CURVA_S**
   - Tabla de plan vs real acumulado por día y área.

7. **DASHBOARD**
   - Visual final con tarjetas KPI, semáforos y gráficos.

8. **DICCIONARIO_ESTADOS**
   - Tabla de homologación de estados de Maximo a categorías analíticas.

---

## 3) Estructura mínima de datos (BASE_OTS)
Campos sugeridos:

- `OT`
- `Programa`
- `Área`
- `Responsable`
- `Fecha_Programada`
- `Fecha_Ejecucion`
- `Estado_OT`
- `Horas_Plan`
- `Horas_Real`
- `Criticidad`

Campos calculados recomendados:

- `Dia_Semana` → `=TEXTO([@Fecha_Programada],"ddd")`
- `Semana_ISO` → `=NUM.DE.SEMANA.ISO([@Fecha_Programada])`
- `Anio` → `=AÑO([@Fecha_Programada])`
- `Cumple_Dia` (1/0):
  - 1 si la OT programada para el día se ejecutó en fecha o antes.
- `Planificada` (1/0): OT incluida en el plan de la semana.
- `Ejecutada` (1/0): OT reportada como cerrada/ejecutada en Maximo.

> Recomendación: transforma la base en **Tabla de Excel** (`Ctrl + T`) para que pivotes y gráficos se actualicen automáticamente.

---

## 4) Definiciones de indicadores

### 4.1 Cumplimiento diario
\[
Cumplimiento\ Diario\ (\%) = \frac{OT\ ejecutadas\ del\ día}{OT\ planificadas\ del\ día} \times 100
\]

### 4.2 Adherencia diaria
\[
Adherencia\ (\%) = \frac{Trabajo\ ejecutado\ según\ plan}{Trabajo\ total\ ejecutado} \times 100
\]

### 4.3 Curva S (acumulado)
\[
\%\ Real\ Acumulado\ (día\ n) = \frac{\sum Ejecutado\ día\ 1..n}{\sum Plan\ semanal} \times 100
\]

\[
\%\ Plan\ Acumulado\ (día\ n) = \frac{\sum Plan\ día\ 1..n}{\sum Plan\ semanal} \times 100
\]

---

## 5) Construcción del dashboard

## 5.1 Tabla dinámica de cumplimiento
- Filas: `Fecha_Programada` (agrupada por día)
- Columnas: `Área` (opcional)
- Valores:
  - `Planificada` (Suma)
  - `Ejecutada` (Suma)
- Campo calculado o medida:
  - `Cumplimiento % = Ejecutada / Planificada`

## 5.2 Tabla dinámica de adherencia
- Filas: `Fecha_Ejecucion`
- Valores:
  - `Ejecutadas_Segun_Plan`
  - `Total_Ejecutadas`
  - `Adherencia % = Ejecutadas_Segun_Plan / Total_Ejecutadas`

## 5.3 Curva S
En hoja `CURVA_S` crea tabla por día (Lun-Dom):

- `Plan_Diario`
- `Real_Diario`
- `Plan_Acumulado %`
- `Real_Acumulado %`

Luego crea gráfico de líneas con ambas curvas (`Plan_Acumulado %` vs `Real_Acumulado %`).

## 5.4 Visual del DASHBOARD
Elementos sugeridos:
- Tarjetas:
  - Cumplimiento semanal acumulado
  - Adherencia semanal acumulada
  - OTs planificadas vs ejecutadas
- Gráficos:
  - Barras: cumplimiento diario
  - Línea: curva S plan vs real
  - Barras apiladas: cumplimiento por área
- Segmentadores:
  - Área
  - Programa
  - Responsable
  - Semana

---

## 6) Flujo operativo diario (actualización)

1. Descargar archivo diario desde Maximo ERP.
2. Copiar/pegar (o cargar con Power Query) nuevos registros en `BASE_OTS`.
3. Verificar formato de fechas y estados.
4. Actualizar todo:
   - `Datos > Actualizar todo`.
5. Revisar pivotes:
   - `PIVOT_CUMPLIMIENTO`
   - `PIVOT_ADHERENCIA`
   - `CURVA_S`
6. Validar KPI del día (coherencia plan vs real).
7. Guardar versión con fecha:
   - `Dashboard_Cumplimiento_YYYYMMDD.xlsx`

---

## 7) Recomendación de automatización (Power Query)

Para evitar errores manuales:

- Crear una carpeta de entrada: `./data/maximo_diario/`.
- Guardar ahí cada descarga diaria.
- En Excel usar **Power Query > Desde carpeta**.
- Transformar y normalizar columnas una sola vez.
- Cargar a `tbl_ots`.
- Con `Actualizar todo`, se actualizará automáticamente la base y pivotes.

---

## 8) Reglas de calidad de datos

Antes de publicar el dashboard del día:

- Sin `OT` duplicadas en mismo corte.
- `Fecha_Programada` y `Fecha_Ejecucion` válidas.
- Estados homologados (ej. `CERRADA`, `EJECUTADA`, `PENDIENTE`).
- Sin áreas vacías.
- `%` entre 0% y 100% (o justificar sobrecumplimiento).

---

## 9) Plantilla de rutina diaria (checklist)

- [ ] Descarga Maximo ERP del día
- [ ] Carga en `BASE_OTS`
- [ ] Actualización de consultas y pivotes
- [ ] Revisión de cumplimiento diario
- [ ] Revisión de adherencia diaria
- [ ] Validación de curva S
- [ ] Publicación de dashboard

---

## 10) Auditoría de tu archivo actual (según capturas)

### Hallazgos clave
1. **Dependencias externas rotas**
   - Aparece el aviso "No se puede actualizar" por vínculos de libro. Esto puede dejar tablas y gráficos con datos antiguos.

2. **Proceso manual frágil en hoja `CONCATENAR`**
   - Se observa `=CONCAT(A1:A296&,",")`, que depende de rango fijo y puede cortar datos cuando cambie el volumen diario.

3. **Mezcla de estados operativos en el análisis**
   - En las tablas se usan estados como `32-WPCOND`, `55-SCH`, `60-INPRG`, `70-COMP`. Si no hay homologación formal por estado, el cumplimiento puede quedar sesgado.

4. **Riesgo de fechas como texto**
   - Formatos tipo `16-04-26 8:00` pueden variar por configuración regional. Si una fecha entra como texto, la agrupación diaria/semanal falla.

5. **Modelo muy acoplado a hojas visuales**
   - Se ven tablas y cálculos distribuidos en la hoja de reporte. Esto dificulta mantenimiento y auditoría.

### Acciones correctivas prioritarias (en orden)
1. **Eliminar vínculos externos**
   - `Datos > Editar vínculos`.
   - Convertir fórmulas externas en valores (si son históricos).
   - Dejar una sola fuente: `tbl_ots` + Power Query local.

2. **Reemplazar `CONCAT` por una alternativa dinámica**
   - Si necesitas lista CSV de OTs para Maximo, usa:
   - `=UNIRCADENAS(",",VERDADERO,UNICOS(FILTRAR(tbl_ots[OT],tbl_ots[Semana_ISO]=B1)))`
   - Así evitas rangos fijos (`A1:A296`).

3. **Crear diccionario de estados (obligatorio)**
   - Hoja `DICCIONARIO_ESTADOS` con columnas:
     - `Estado_Maximo`
     - `Categoria` (`Planificada`, `En Progreso`, `Ejecutada`, `No válida`)
     - `CuentaCumplimiento` (1/0)
   - Cruza este diccionario desde Power Query o `BUSCARX`.

4. **Normalizar fecha/hora en Power Query**
   - Tipo de dato `datetime` para `Inicio programado`.
   - Crear campos derivados:
     - `Fecha_Programada` (solo fecha)
     - `Dia_Semana`
     - `Semana_ISO`

5. **Separar capas del modelo**
   - `BASE_OTS` (datos)
   - `MODELO_KPI` (cálculos)
   - `DASHBOARD` (solo visualización)

---

## 11) Implementación mínima para que se actualice cada día sin romperse

### Paso A: fuente única
- Carpeta diaria: `./data/maximo_diario/`.
- Carga por Power Query (no copy/paste manual).

### Paso B: tabla maestra
- Salida de Power Query a `tbl_ots`.
- Sin fórmulas manuales dentro de la tabla.

### Paso C: pivotes robustas
- `PIVOT_CUMPLIMIENTO`: usa `CuentaCumplimiento`.
- `PIVOT_ADHERENCIA`: usa `Ejecutadas_Segun_Plan` y `Total_Ejecutadas`.
- Segmentadores compartidos por semana/área/programa.

### Paso D: control diario
- Botón o macro simple: `ActualizarTodo + refrescar pivotes + timestamp`.

### Paso E: validaciones automáticas
- Si `% cumplimiento` > 100% o < 0%, marcar en rojo.
- Si OTs del día = 0, mostrar alerta de carga incompleta.

---

## 12) Si la plataforma no permite adjuntar el Excel: protocolo de revisión remota

Si no puedes subir el `.xlsx`, usa este protocolo para que pueda auditar tus fórmulas de seguimiento diario con precisión.

### Opción A (recomendada): compartir archivo en nube + enlace
1. Guarda una copia anonimizada: `Adherencia_SEMxx_REV.xlsx`.
2. Súbela a OneDrive / Google Drive / SharePoint.
3. Activa permiso "cualquier persona con enlace" (solo lectura).
4. Comparte el enlace en el chat.

### Opción B: exportar fórmulas en texto (sin compartir archivo)
En Excel crea una hoja nueva `EXPORT_FORMULAS` y usa:

- En `A1`: `Hoja`
- En `B1`: `Celda`
- En `C1`: `Fórmula`

Luego, para cada hoja crítica (`Tablas cumplimiento`, `Lista de Órdenes de trabajo1`, `OTs atrasadas`, `OTs incumplimiento`, `CONCATENAR`):
- Selecciona rango usado.
- Copia y pega en `EXPORT_FORMULAS` como:
  - Nombre de hoja
  - Dirección de celda
  - `FORMULATEXTO(celda)`

Guarda como CSV (`export_formulas.csv`) y compártelo.

### Opción C: paquete mínimo de evidencias (capturas)
Comparte 8 capturas exactas:
1. Barra de fórmulas visible para KPI principal de cumplimiento.
2. Barra de fórmulas visible para adherencia diaria.
3. Rango de curva S (plan acumulado vs real acumulado).
4. Configuración de campos de la tabla dinámica de cumplimiento.
5. Configuración de campos de la tabla dinámica de adherencia.
6. Ventana `Datos > Editar vínculos`.
7. Ventana `Consultas y conexiones` (Power Query).
8. Hoja `CONCATENAR` mostrando la fórmula completa.

### Opción D: inventario automático con Power Query + pivotes
Si quieres una revisión 100% técnica, comparte además:
- Definición M de cada consulta (Editor avanzado).
- Nombre de cada tabla y rango (`tbl_ots`, etc.).
- Medidas DAX (si usas modelo de datos).

---

## 13) Checklist de lo que necesito para validar tus fórmulas diario

- [ ] Fórmula exacta de **Cumplimiento diario** (celda y hoja).
- [ ] Fórmula exacta de **Adherencia diaria** (celda y hoja).
- [ ] Fórmula/rango de **Plan acumulado** curva S.
- [ ] Fórmula/rango de **Real acumulado** curva S.
- [ ] Regla usada para contar OT "cumplida" por estado (`32-WPCOND`, `55-SCH`, `60-INPRG`, `70-COMP`).
- [ ] Confirmación de que no existen vínculos externos rotos.
- [ ] Confirmación de tipo fecha/hora válido (no texto).

Con este paquete sí puedo hacer una verificación puntual de fórmulas, identificar errores de lógica y devolverte correcciones celda por celda.

## 14) Entregable final esperado

Un dashboard semanal que permita:

- Ver cumplimiento diario y acumulado.
- Medir adherencia real al plan.
- Visualizar desviaciones con curva S por área.
- Tomar decisiones operativas cada día con datos actualizados de Maximo ERP.
- Mantener trazabilidad y repetibilidad sin depender de vínculos externos ni rangos manuales.
