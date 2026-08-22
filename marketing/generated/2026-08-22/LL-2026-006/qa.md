# QA — LL-2026-006

## Verdict
READY_FOR_DESIGN

## Checks
- Brand: PASS
- Product Truth: PASS
- Facts: PASS
- Privacy: PASS
- Screenshot/UI integrity: PASS
- Prelaunch wording: PASS
- Duplicate-topic risk: PASS — mantiene el foco en disciplina de puja; no debe derivar hacia la comparación plantilla/caja de LL-2026-002/004.

## Production guardrails
- Mantener la pieza evergreen: no añadir saldos, porcentajes, precios, jugadores o resultados concretos.
- No mostrar una pantalla o dashboard ficticio de LigaLab.
- Resolver visualmente con tipografía, contraste y metáfora de presupuesto/margen; `needs_capture=false`.
- No afirmar que LigaLab calcula, recomienda o automatiza una puja salvo que PRODUCT_TRUTH lo autorice explícitamente.
- No presentar “poder gastar” como una regla matemática universal: el mensaje es de disciplina de decisión, no una cifra calculada.

## Design handoff
Hook principal: `TENER DINERO ≠ PODER GASTARLO TODO`.

Estructura sugerida 9:16:
1. Hook grande en el primer frame.
2. Contraste visual entre `SALDO` y `MARGEN DE DECISIÓN` sin cantidades numéricas.
3. Remate: tener caja amplía opciones; no convierte cualquier puja en buena decisión.
4. Firma discreta `LigaLab · en construcción`.

## Final status
`ready_for_design`
