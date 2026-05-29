// =========================================================================
// DimDisciplina — Mapeo Grupo dueño (persongroup) → Disciplina
// =========================================================================
// Réplica EXACTA de la fórmula Excel del usuario:
//   =SI(O(J="PLDMEC01"; J="PLDMEC02"; J="PCDMEC01"); "Mecánicos";
//       SI(O(J="PLDELE01"; J="PCDELE01"); "Eléctricos";
//          SI(O(J="PLDINS01"; J="PCDINS01"); "Instrumentistas";
//             SI(BUSCAR("DCS"; J); "DCS";
//                SI(O(J="PLDCIV01"); "Civiles"; "Otros")))))
//
// Usa esta tabla como dimensión y crea relación FactOTs[persongroup] →
// DimDisciplina[Grupo].

let
    origen = #table(
        type table [Grupo = text, Disciplina = text],
        {
            {"PLDMEC01", "Mecánicos"},
            {"PLDMEC02", "Mecánicos"},
            {"PCDMEC01", "Mecánicos"},
            {"PLDELE01", "Eléctricos"},
            {"PCDELE01", "Eléctricos"},
            {"PLDINS01", "Instrumentistas"},
            {"PCDINS01", "Instrumentistas"},
            {"PPDCS01",  "DCS"},
            {"PLDCIV01", "Civiles"}
        }
    ),
    // Fila wildcard: cualquier grupo que contenga "DCS" no esté listado arriba
    // se manejará vía columna calculada en el modelo (ver dax_measures.dax).
    tipada = Table.TransformColumnTypes(origen, {{"Grupo", type text}, {"Disciplina", type text}})
in
    tipada
