# Revisión remota de fórmulas cuando el enlace de Google Drive no abre

Este procedimiento está pensado para cuando compartes un enlace de Google Drive/Sheets y la plataforma de revisión no puede abrirlo.

## Objetivo
Obtener evidencia suficiente para validar **fórmulas de seguimiento diario** (cumplimiento, adherencia y curva S) sin necesitar el archivo `.xlsx` completo.

## Opción rápida (10 minutos)

1. En tu Excel, crea una hoja llamada `AUDITORIA_FORMULAS`.
2. Copia en esa hoja (como texto) estas 4 fórmulas clave:
   - Cumplimiento diario
   - Adherencia diaria
   - % Plan acumulado
   - % Real acumulado
3. Agrega al lado:
   - Hoja origen
   - Celda origen
   - Descripción KPI
4. Guarda como `AUDITORIA_FORMULAS.csv`.
5. Comparte el contenido CSV en el chat (copiar/pegar).

## Opción completa (recomendada)

### 1) Exportar fórmulas automáticamente (macro VBA)

En un módulo estándar pega este código y ejecuta `ExportarFormulas`:

```vb
Option Explicit

Sub ExportarFormulas()
    Dim ws As Worksheet, outWs As Worksheet
    Dim c As Range, usedRng As Range
    Dim r As Long

    On Error Resume Next
    Application.DisplayAlerts = False
    Worksheets("AUDITORIA_FORMULAS").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0

    Set outWs = Worksheets.Add
    outWs.Name = "AUDITORIA_FORMULAS"

    outWs.Range("A1:F1").Value = Array("Hoja", "Celda", "Formula", "Valor", "EsError", "Comentario")
    r = 2

    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> outWs.Name Then
            Set usedRng = ws.UsedRange
            For Each c In usedRng.Cells
                If c.HasFormula Then
                    outWs.Cells(r, 1).Value = ws.Name
                    outWs.Cells(r, 2).Value = c.Address(False, False)
                    outWs.Cells(r, 3).Value = c.FormulaLocal
                    outWs.Cells(r, 4).Value = c.Value
                    outWs.Cells(r, 5).Value = IsError(c.Value)
                    outWs.Cells(r, 6).Value = ""
                    r = r + 1
                End If
            Next c
        End If
    Next ws

    outWs.Columns.AutoFit
    MsgBox "Exportación finalizada en hoja AUDITORIA_FORMULAS", vbInformation
End Sub
```

### 2) Exportar Power Query (si aplica)
- Abre **Datos > Consultas y conexiones**.
- En cada consulta: **Editor avanzado**.
- Copia el código M a un `.txt` por consulta.

### 3) Exportar configuración de pivotes
Para cada pivote:
- Captura de **Lista de campos**.
- Captura de **Configuración de campo de valor**.
- Captura de filtros activos.

## Paquete mínimo a compartir

- `AUDITORIA_FORMULAS.csv`
- 3 capturas:
  - Tabla/pivote de cumplimiento
  - Tabla/pivote de adherencia
  - Tabla de curva S
- (Opcional) Código M de consultas

## Qué validaré con ese paquete

1. Denominadores correctos (evitar divisiones por cero y sesgos).
2. Definición de OT cumplida por estado (`32-WPCOND`, `55-SCH`, `60-INPRG`, `70-COMP`).
3. Coherencia entre detalle diario y acumulado semanal.
4. Trazabilidad entre tabla base, pivote y gráfico.

## Resultado esperado de la revisión

- Lista de errores detectados (si existen).
- Fórmulas corregidas (versión Excel ES).
- Recomendación final para dejar actualización diaria en 1 clic.
