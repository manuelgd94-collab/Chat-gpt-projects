// =========================================================================
// FactOTs — Consulta principal a Maximo OSLC con paginación
// =========================================================================
// Lee /maximo/oslc/os/mxwo filtrando por sitio y ventana de fechas, paginando
// hasta agotar resultados. Usa Basic Auth (Maximo 7.6.1.3).
//
// Requiere los parámetros: MaximoBaseUrl, SiteID, SemanaDesde, SemanaHasta
// (ver 01_Parametros.pq).
//
// Tipos de mantenimiento (campo 'worktype' en Maximo):
//   PM  → Preventivo
//   CM  → Correctivo
//   EM  → Emergencia
//   WR  → Solicitud de trabajo
//   PR  → Proyecto
// =========================================================================

let
    // ---- Construcción del filtro OSLC ----
    desdeISO = DateTime.ToText(DateTime.From(SemanaDesde), [Format="yyyy-MM-ddT00:00:00-04:00"]),
    hastaISO = DateTime.ToText(DateTime.From(Date.AddDays(SemanaHasta, 1)), [Format="yyyy-MM-ddT00:00:00-04:00"]),

    oslcWhere =
        "siteid=""" & SiteID & """" &
        " and schedstart>=""" & desdeISO & """" &
        " and schedstart<""" & hastaISO & """",

    oslcSelect = Text.Combine({
        "wonum","description","status","status_description",
        "siteid","worktype","wopriority",
        "schedstart","schedfinish",
        "targstartdate","targcompdate",
        "actstart","actfinish",
        "reportdate","location","assetnum",
        "persongroup","classstructureid",
        "estdur","actlabhrs"
    }, ","),

    pageSize = 1000,

    // ---- Función recursiva de paginación ----
    fetchPage = (pageNum as number) as list =>
        let
            url = MaximoBaseUrl,
            query = [
                #"oslc.select"   = oslcSelect,
                #"oslc.where"    = oslcWhere,
                #"oslc.pageSize" = Number.ToText(pageSize),
                #"pageno"        = Number.ToText(pageNum),
                #"lean"          = "1",
                #"collectioncount" = "1"
            ],
            raw = Json.Document(Web.Contents(url, [
                Query   = query,
                Headers = [ Accept = "application/json" ],
                Timeout = #duration(0, 0, 2, 0)
            ])),
            members  = if raw[member]? = null then {} else raw[member],
            nextHref = try raw[responseInfo][nextPage][href] otherwise null,
            hasNext  = nextHref <> null and List.Count(members) = pageSize,
            siguiente = if hasNext then @fetchPage(pageNum + 1) else {}
        in
            List.Combine({members, siguiente}),

    todos = fetchPage(1),

    // ---- A tabla y expansión de columnas ----
    tabla = Table.FromList(todos, Splitter.SplitByNothing(), {"Item"}, null, ExtraValues.Error),
    expandida = Table.ExpandRecordColumn(tabla, "Item", {
        "wonum","description","status","status_description",
        "siteid","worktype","wopriority",
        "schedstart","schedfinish","targstartdate","targcompdate",
        "actstart","actfinish","reportdate","location","assetnum",
        "persongroup","classstructureid","estdur","actlabhrs"
    }),

    // ---- Tipos ----
    tipada = Table.TransformColumnTypes(expandida, {
        {"wonum", type text},
        {"description", type text},
        {"status", type text},
        {"status_description", type text},
        {"siteid", type text},
        {"worktype", type text},
        {"wopriority", Int64.Type},
        {"schedstart", type datetime},
        {"schedfinish", type datetime},
        {"targstartdate", type datetime},
        {"targcompdate", type datetime},
        {"actstart", type datetime},
        {"actfinish", type datetime},
        {"reportdate", type datetime},
        {"location", type text},
        {"assetnum", type text},
        {"persongroup", type text},
        {"classstructureid", type text},
        {"estdur", type number},
        {"actlabhrs", type number}
    }),

    // ---- Derivaciones (paridad con src/lib/derive.ts del dashboard web) ----
    conFechas = Table.AddColumn(tipada, "DiaProgramado",
        each if [schedstart] = null then null else Date.From([schedstart]), type date),
    conReal = Table.AddColumn(conFechas, "DiaReal",
        each if [actstart] = null then null else Date.From([actstart]), type date),

    conCerrada = Table.AddColumn(conReal, "Cerrada",
        each let s = Text.Upper(Text.Trim([status] ?? "")) in
             Text.StartsWith(s, "70-COMP") or Text.StartsWith(s, "80-CLOSE"),
        type logical),

    conAtrasada = Table.AddColumn(conCerrada, "Atrasada",
        each [schedstart] <> null
             and not [Cerrada]
             and Date.From([schedstart]) < Date.From(DateTime.LocalNow()),
        type logical),

    // ---- Tipo de mantenimiento ----
    conTipoMant = Table.AddColumn(conAtrasada, "TipoMantenimiento",
        each let w = Text.Upper(Text.Trim([worktype] ?? "")) in
             if w = "PM" then "Preventivo"
             else if w = "CM" or w = "EM" then "Correctivo"
             else if w = "WR" then "Solicitud"
             else "Otro",
        type text),

    // ---- Programa (Pipeline / Puerto / Desaladora / Otros) ----
    conPrograma = Table.AddColumn(conTipoMant, "Programa",
        each let
                pg  = Text.Upper(Text.Trim([persongroup] ?? "")),
                wn  = Text.Upper(Text.Trim([wonum] ?? "")),
                loc = Text.Upper(Text.Trim([location] ?? ""))
             in
                if Text.StartsWith(pg, "PL") or Text.StartsWith(wn, "PIP") then "Pipeline"
                else if Text.Contains(loc, "0571") or Text.Contains(loc, "0575") then "Desaladora"
                else if Text.Contains(loc, "0520") or Text.Contains(loc, "0530")
                     or Text.Contains(loc, "0540") or Text.Contains(loc, "0590") then "Puerto"
                else "Otros",
        type text),

    // ---- Estado normalizado (primeros 2 dígitos) ----
    conEstadoCorto = Table.AddColumn(conPrograma, "EstadoCorto",
        each Text.Start(Text.Trim([status] ?? ""), 2), type text),

    // ---- Categoría operativa ----
    conCategoria = Table.AddColumn(conEstadoCorto, "CategoriaEstado",
        each let e = [EstadoCorto] in
             if e = "32" or e = "40" or e = "50" or e = "90" then "Incumplimiento"
             else if e = "55" or e = "60" then "Atrasadas por cierre"
             else if e = "70" or e = "80" then "Cerradas"
             else "Otros",
        type text)
in
    conCategoria
