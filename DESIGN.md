# DESIGN.md — Mintpass

Fuente: Manual de Identidad oficial de Mintpass. Estas reglas son fijas; craft/shape/typeset/colorize deben respetarlas, no reinterpretarlas.

## Modo por defecto
**Light mode como default**, con dark mode como alternativa completa (no decorativa). Esto es una decisión deliberada distinta al manual original (que pensaba Dark-mode-first para el Pitch Deck): la dApp de cara al usuario final debe sentirse como un producto de consumo confiable y abierto — blanco genera percepción de transparencia y limpieza, algo crítico cuando el pilar de marca es "prevención de fraude". El Gris Carbón se reserva para dark mode y para piezas institucionales (Pitch Deck, README).

## Paleta (valores fijos del manual — no modificar hex)

| Token | Hex | Uso |
|---|---|---|
| `--mint-primary` | `#4BAA46` | Color institucional. Headers, validación, marca. |
| `--solana-accent` | `#14F195` | EXCLUSIVO para CTAs críticos: "Conectar", "Mintear Pase", confirmar compra. No usar decorativamente — pierde su poder de señal si se repite en toda la UI. |
| `--solana-contrast` | `#9945FF` | Fondos complejos, tarjetas, gradientes Web3. Usar con moderación en light mode (puede verse "cripto genérico" si se abusa); más protagonismo permitido en dark mode. |
| `--carbon-gray` | `#1E1E1E` | Fondo estructural en dark mode y piezas institucionales. En light mode: texto primario sobre blanco, nunca negro puro (#000). |
| `--pure-white` | `#FFFFFF` | Fondo base en light mode. Texto sobre fondos oscuros. |

### Adaptación para light mode (no está en el manual original, criterio a aplicar)
- Fondo base: `#FFFFFF` y grises muy claros derivados (ej. `#F7F8F7`) para separar secciones sin usar líneas duras.
- `#14F195` sobre blanco puede perder contraste de accesibilidad en texto — usar solo en botones sólidos con texto `#1E1E1E` encima (nunca texto verde sobre blanco para CTAs).
- `#9945FF` funciona bien como acento de borde, ícono o gradiente sutil en tarjetas; evitar como fondo grande en light mode.
- Mantener proporción 60/30/10: 60% blanco/gris claro, 30% Verde Mintpass + Carbón (texto/estructura), 10% Verde Solana (acción) + Morado (acento puntual).

## Tipografía
- **Display/Títulos**: Space Grotesk (preferida) o Outfit como fallback. Uso: encabezados, hitos numéricos grandes (ej. precio, contador de boletos disponibles).
- **Cuerpo/UI**: Inter (preferida) o Roboto como fallback. Uso: todo dato técnico — direcciones de wallet, hashes, precios — debe usar variante tabular/monoespaciada de Inter si está disponible, para que los números no "brinquen" al cambiar.

## Logotipo — reglas de protección
- Área de respeto mínima = diámetro de las muescas circulares laterales del boleto. No colocar texto ni gráficos dentro de ese perímetro.
- Variante blanca o verde para encabezar documentación técnica/README.
- El talón derecho (zona de validación Solana) nunca se recorta ni se sustituye — es la garantía visual de pertenencia al ecosistema.

## Principios de UI (derivados de los pilares de marca, para que Impeccable los aplique en craft/shape)
1. **Inmutabilidad y Seguridad → Momentos de confirmación visual explícitos.** Cada acción irreversible (mint, compra, transferencia) tiene un estado de confirmación claro, con el sello/check verde como lenguaje visual recurrente. Nunca un simple toast genérico.
2. **Eficiencia Web3 → Cero fricción percibida.** El usuario final no debe ver spinners de blockchain "crudos". Loading states con copy humano ("Confirmando tu lugar...", no "Esperando confirmación de bloque").
3. **Conexión Directa → Personalización visual del boleto.** Cada NFT-boleto se renderiza como un objeto de colección deseable (no como una fila de tabla), con metadata del evento integrada visualmente — esto es lo que nos separa de un PDF de Ticketmaster.

## Anti-patrones explícitos para Mintpass
- Gradientes morado-verde-cyan usados sin jerarquía (cliché Web3) — el gradiente Verde→Morado del manual se usa SOLO para delimitar secciones, no como fondo decorativo de cualquier card.
- Texto verde Solana (#14F195) sobre fondo blanco para cuerpo de texto (falla de contraste).
- Iconografía de criptomonedas genérica (monedas, cohetes, "to the moon").
- Checkout de más de 2 pasos visibles para el asistente final.
