# 🎟️ Mintpass — Tickets NFT Anti-Fraude para Eventos en LATAM

<p align="center">
  <img src="public/icon.png" alt="Mintpass Logo" width="120" />
</p>

<p align="center">
  <strong>Plataforma descentralizada de boletos digitales construida sobre Solana con Metaplex Core.</strong>
</p>

<p align="center">
  <a href="https://mintpass-flame.vercel.app">🌐 Demo en Vercel</a> ·
  <a href="https://youtu.be/X_fvnamb5Wg">🎬 Video Demo (YouTube)</a>
</p>

---

## 1. Resumen Ejecutivo

**Mintpass** es una plataforma de ticketing descentralizada construida sobre Solana. Cada boleto es un NFT de Metaplex Core, lo que garantiza autenticidad, trazabilidad on-chain y protección contra reventa no autorizada. La plataforma está diseñada para el mercado LATAM, con pagos via MercadoPago/stripe, onboarding Web2 a través de Privy, y escaneo offline-first para eventos en zonas con conectividad limitada.

Este documento describe el estado actual del codebase (v1), las brechas identificadas frente a la especificación v2.0, y el plan de desarrollo para la fase de incubación.


## 🚨 El Problema

En Latinoamérica, los eventos en vivo enfrentan un problema de fraude masivo:

- **Reventa ilegal** con márgenes de hasta 10x el precio original.
- **Boletos clonados** por captura de pantalla que permiten múltiples accesos.
- **Plataformas centralizadas** (Ticketmaster) que cobran comisiones abusivas sin ofrecer transparencia.
- **Zero proof of attendance** — no queda registro verificable de que asististe.

## ✅ Nuestra Solución

**Mintpass** convierte cada boleto en un **NFT de Metaplex Core** en Solana, pero de forma invisible para el usuario (100% custodial):

| Feature | Cómo funciona |
|---------|---------------|
| 🎫 **Ticket NFT** | Cada entrada es un activo digital real e irrepetible en la blockchain. |
| 🌍 **Libre Acceso (Permissionless)** | Cualquier persona puede crear un evento; compras sencillas con tarjeta (MercadoPago/Stripe). |
| 🔄 **QR Dinámico (TOTP)** | El código rota cada 30 segundos con validación criptográfica HMAC, eliminando las capturas de pantalla. |
| ✅ **Check-in On-Chain & Offline** | El staff verifica la autenticidad incluso sin internet (PWA local), sincronizando luego con la blockchain. |
| 🏆 **POAP Mutation** | Tras el evento, el ticket muta y se convierte en un coleccionable permanente. |
| 🔒 **Escrow de Pagos & Price Cap** | Los fondos se retienen hasta verificar check-ins reales. La reventa tiene precios tope (Price Cap) a nivel contrato. |
| 📊 **Reputación On-Chain** | Los organizadores acumulan un puntaje público e inmutable. |

## 2. Estado Actual del Proyecto (v1)

El codebase actual representa un MVP de demostración funcional con más de 5,000 líneas de código distribuidas entre smart contracts en Rust, integración blockchain en TypeScript, y una interfaz de usuario completa.

### 2.1 Smart Contracts — Anchor / Rust
Los contratos son la base más sólida del proyecto. Están completos, documentados en español y desplegados en Devnet con Program IDs reales.

- **mintpass-escrow:** Custodia de pagos con reglas on-chain (initialize, send, check-in, release, refund).
- **mintpass-checkin:** Prevención de duplicados a nivel protocolo usando cuentas PDA.
- **mintpass-event-registry:** Base de datos descentralizada de eventos.
- **mintpass-reputation:** Sistema inmutable que suma/resta puntos al organizador.

### 2.2 Integración Blockchain — TypeScript
Contamos con utilidades sólidas para mintear NFTs (Metaplex), guardar metadata (Pinata) y validar firmas (Blinks). En la v2.0, todo este código deberá moverse al backend (Server Actions de Next.js) para proteger las llaves y funcionar como un modelo 100% custodial.

### 2.3 Interfaz de Usuario
El frontend (React 19 + Next.js App Router) incluye un catálogo, flujo de compra animado, tickets visuales con QR dinámico (30s) y un panel para staff con escáner láser. Todo el sistema de diseño premium, layouts y el CSS custom es altamente reutilizable para la versión 2.0.

---

## 3. Brechas Identificadas — v1 vs v2.0

El proyecto se encuentra en transición hacia la versión 2.0 (modelo 100% custodial). Las principales áreas de actualización son:

- **Infraestructura:** Migración a Next.js App Router y creación de una base de datos relacional (PostgreSQL + Prisma).
- **Autenticación y Pagos:** Integración de Privy (wallets invisibles y login social) y pasarelas de pago fiat (MercadoPago / Stripe).
- **Seguridad Anti-Fraude:** Desarrollo de mecanismos anti-reventa avanzados, incluyendo códigos QR con TOTP real y topes de precio (Price Cap) on-chain.
- **Sincronización:** Adopción de webhooks y soporte offline (PWA + IndexedDB) para escaneo de boletos sin internet.

---

## 4. Plan de Desarrollo — v2.0

Las funcionalidades pendientes se dividen en 4 fases principales para su incubación:

### 🔴 Fase 0 — Fundamentos
- Modelado y configuración de la base de datos (PostgreSQL).
- Autenticación con Privy (roles de staff, comprador y administrador).
- Movimiento de la lógica blockchain a Server Actions seguras.

### 🟡 Fase 1 — Funcionalidades Core
- Pasarelas de pago fiat integradas (MercadoPago).
- Minteo automático y custodial para el usuario.
- Aplicación instalable (PWA) para el staff y escáner inteligente en modo offline.

### 🟢 Fase 2 — Anti-Reventa
- Límites de boletos vinculados a identidad real, no solo a la wallet.
- Mercado secundario controlado con precios limitados desde el contrato (Anchor).
- Listas negras y seguridad en los endpoints.

### 🔵 Fase 3 — Post-MVP
- Sistema de detección de patrones anómalos (Analytics de reventa).
- Sincronización en red local (LAN Mesh) para puertas múltiples sin WiFi.
- Sistema de taquilla para ventas físicas en el recinto.
