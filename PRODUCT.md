# PRODUCT.md — Mintpass

## Qué es
Mintpass es una plataforma de boletaje y control de accesos basada en NFTs sobre Solana. Reemplaza al boleto tradicional (PDF, código de barras, papel) con un coleccionable digital verificable on-chain, con arquitectura anti-reventa de múltiples capas (price caps on-chain, Freeze Authority, límites de compra por identidad, modo Soulbound, KYC opcional por organizador).

## Audiencia
Dos perfiles distintos que comparten la misma interfaz, con journeys diferenciados:

1. **Asistente / comprador final** — Persona promedio de LATAM, no necesariamente cripto-nativa. Compra boletos para conciertos, conferencias o eventos. Onboarding debe asumir CERO conocimiento de wallets, gas fees o blockchain. Login social vía Privy (embedded wallet invisible).
2. **Organizador de eventos** — Dueño del evento, necesita dashboard de control: ventas en tiempo real, configuración de anti-reventa, check-in en puerta, métricas. Más sofisticado, pero igual de impaciente con fricción innecesaria.

## Lane de producto
**Producto/SaaS funcional**, no landing de marketing ni portafolio editorial. Esto significa: la prioridad es claridad de tarea, jerarquía de información, estados (loading, error, éxito, vacío) y reducción de fricción en el flujo de pago — no composición editorial o imágenes a sangre completa como prioridad #1. La estética de marca (ver DESIGN.md) debe convivir con un sistema de UI consistente tipo producto SaaS, no tipo revista.

## Voz / tono
Confiable, directo, sin jerga cripto innecesaria de cara al asistente final ("Tu boleto" en vez de "Tu NFT", "Conectar" en vez de "Conectar wallet" cuando sea posible ocultarlo). Hacia el organizador, sí se puede hablar el lenguaje técnico (Anchor, PDAs, on-chain) porque es un usuario más sofisticado.

## Anti-referencias (qué NO queremos)
- **Ticketmaster**: NO queremos checkout de múltiples pasos con cargos ocultos que aparecen al final, NO queremos selección de asiento confusa, NO queremos páginas de carga eternas en hora pico (su mayor queja de usuarios).
- NO queremos estética "cripto genérica" (gradientes morado/cyan sin propósito, iconografía de monedas flotando, lenguaje de hype "to the moon").
- NO queremos un dashboard de organizador que se vea como panel de trading (demasiados números sin jerarquía).

## Referencias de UX a superar (el estándar a vencer, no a copiar)
- **Duolingo**: claridad de onboarding, una sola acción obvia por pantalla, microcopy que reduce ansiedad, feedback inmediato de cada acción (éxito/error visual instantáneo).
- **Airbnb**: jerarquía visual de confianza (reviews, verificación, fotos grandes que generan deseo), checkout que se siente seguro y transparente en cada paso, nunca sorpresas de precio al final.
- **Diferenciador de Mintpass**: ninguno de los dos resuelve "demuéstrame que este boleto es 100% legítimo y no me lo van a revender falsificado". Ese es nuestro momento de confianza único — hay que diseñarlo como un momento hero de la interfaz (ej. un "sello de autenticidad" visual animado al verificar el boleto), no como un detalle técnico escondido.

## Plataformas
Web app (Next.js App Router), mobile-first responsive. El check-in en puerta del organizador probablemente se usa desde un teléfono, así que esa vista debe funcionar perfecto en pantalla chica con una sola mano.
