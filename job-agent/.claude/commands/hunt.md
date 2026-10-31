---
description: Ronda autónoma de búsqueda de empleo - buscar, evaluar, preparar borradores e informe del día (nunca envía nada)
argument-hint: [enfoque opcional, p. ej. "data engineer, remoto"]
---

Lanza el subagente `job-hunter` (.claude/agents/job-hunter.md) con el Agent tool y pásale como enfoque de esta ronda: "$ARGUMENTS" (vacío = usar `hunt.config.md`).

No intervengas entre pasos: el agente trabaja de forma autónoma. Cuando termine, muestra solo su resumen, la ruta del informe en `output/hunts/` y las 3 mejores ofertas. Recuerda al usuario que los borradores son para revisar y que el envío lo decide él con `/apply <url>`.
