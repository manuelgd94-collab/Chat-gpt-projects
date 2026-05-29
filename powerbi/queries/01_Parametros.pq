// Parámetros editables desde Power BI Desktop:
// Inicio → Administrar parámetros
//
// Crea 4 parámetros con estos nombres y valores actuales (ejemplo).
// Power Query genera código equivalente al de abajo automáticamente.

// === MaximoBaseUrl (Texto) =============================================
// Endpoint OSLC del Object Structure MXWO.
"https://teck.maximo.com/maximo/oslc/os/mxwo" meta [
    Description = "Endpoint OSLC del Object Structure MXWO"
]

// === SiteID (Texto) ====================================================
// Código del sitio Maximo para Puerto Pipeline.
// PEDIR A IT EL CÓDIGO EXACTO. Ejemplo: "PUERTO" o "PPCH".
"PUERTO" meta [
    Description = "Site ID del programa Puerto Pipeline"
]

// === SemanaDesde (Fecha) ===============================================
// Inicio de la ventana a traer. Por defecto: lunes de la semana anterior.
#date(2026, 5, 18) meta [
    Description = "Inicio de la ventana semanal (incluido)"
]

// === SemanaHasta (Fecha) ===============================================
// Fin de la ventana. Por defecto: domingo de la semana actual.
#date(2026, 5, 31) meta [
    Description = "Fin de la ventana semanal (incluido)"
]
