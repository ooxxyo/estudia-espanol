# Academic Content Contracts

## Modelo universal

La jerarquía es `Subject → Unit → Topic → Review Card / Question`. El frontend ofrece `subjectContent(subjectId)`, `subjectUnits(subjectId)`, `unitTopics(unitId)`, `topicCards(topicId)` y `topicQuestions(topicId)`. El Study Engine consume ese contrato sin copiar lógica por materia.

## Incorporar material

1. Organiza el material proporcionado sin añadir definiciones externas.
2. Declara metadata estable de materia, unidad y temas.
3. Crea tarjetas y preguntas referenciando IDs válidos.
4. Ejecuta `validateAcademicCatalog` para detectar IDs duplicados, huérfanos y respuestas inválidas.
5. Previsualiza en local y prueba aislamiento, repaso, práctica y examen.
6. Solicita aprobación académica antes de activar el contenido.

El flujo futuro es `material recibido → organize → parse → validate → preview → approve → activate`; nunca publica directamente.

Las primeras tarjetas interactivas usan exclusivamente review cards aprobadas: “Lo sé”/“No lo sé” guarda estado, última revisión y contador. “Preparar prueba” y “Practicar débiles” usan preguntas oficiales existentes; no generan material nuevo.

## Versionado y procedencia

Las unidades conservan `current`, `previous`, `completed` o `archived`; nunca se borran al avanzar. El versionado futuro usará revisiones inmutables con snapshot, autor, fecha y motivo. Procedencias previstas: `teacher_material`, `admin_created`, `community_contribution`, `admin_verified`, `imported`, `legacy` y `generated_draft`. Esta última jamás se presenta como material oficial.
