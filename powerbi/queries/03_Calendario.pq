// =========================================================================
// DimCalendario — Tabla de fechas
// =========================================================================
// Cubre la ventana de parámetros + 1 año atrás para análisis históricos.

let
    inicio = Date.AddYears(SemanaDesde, -1),
    fin    = Date.AddMonths(SemanaHasta, 1),
    dias   = Duration.Days(fin - inicio) + 1,
    listaFechas = List.Dates(inicio, dias, #duration(1,0,0,0)),
    tabla = Table.FromList(listaFechas, Splitter.SplitByNothing(), {"Fecha"}),
    tipada = Table.TransformColumnTypes(tabla, {{"Fecha", type date}}),

    conAnio    = Table.AddColumn(tipada,    "Año",       each Date.Year([Fecha]),      Int64.Type),
    conMesNum  = Table.AddColumn(conAnio,   "MesNum",    each Date.Month([Fecha]),     Int64.Type),
    conMes     = Table.AddColumn(conMesNum, "Mes",       each Date.MonthName([Fecha]), type text),
    conSemNum  = Table.AddColumn(conMes,    "SemanaISO", each Date.WeekOfYear([Fecha], Day.Monday), Int64.Type),
    conSemana  = Table.AddColumn(conSemNum, "Semana",    each "S" & Text.PadStart(Number.ToText(Date.WeekOfYear([Fecha], Day.Monday)), 2, "0") & "_" & Text.End(Number.ToText(Date.Year([Fecha])), 2), type text),
    conDiaNum  = Table.AddColumn(conSemana, "DiaSemNum", each Date.DayOfWeek([Fecha], Day.Monday) + 1, Int64.Type),
    conDia     = Table.AddColumn(conDiaNum, "DiaSem",    each Date.DayOfWeekName([Fecha]), type text),
    conEsHoy   = Table.AddColumn(conDia,    "EsHoy",     each [Fecha] = Date.From(DateTime.LocalNow()), type logical)
in
    conEsHoy
