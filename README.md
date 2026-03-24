# 🎟️ Mintpass — Tickets NFT Anti-Fraude para Eventos en LATAM

<p align="center">
  <img src="template_codespaces/public/icon.png" alt="Mintpass Logo" width="120" />
</p>

<p align="center">
  <strong>Plataforma descentralizada de boletos digitales construida sobre Solana con Metaplex Core.</strong>
</p>

<p align="center">
  <a href="https://mintpass-flame.vercel.app">🌐 Demo en Vercel</a> ·
  <a href="https://youtu.be/X_fvnamb5Wg">🎬 Video Demo (YouTube)</a>
</p>

---

## 🚨 El Problema

En Latinoamérica, los eventos en vivo enfrentan un problema de fraude masivo:

- **Reventa ilegal** con márgenes de hasta 10x el precio original.
- **Boletos clonados** por captura de pantalla que permiten múltiples accesos.
- **Plataformas centralizadas** (Ticketmaster) que cobran comisiones abusivas sin ofrecer transparencia.
- **Zero proof of attendance** — no queda registro verificable de que asististe.

## ✅ Nuestra Solución

**Mintpass** convierte cada boleto en un **NFT de Metaplex Core** en Solana:

| Feature | Cómo funciona |
|---------|---------------|
| 🎫 **Ticket NFT** | Cada entrada es un activo digital real e irrepetible en la blockchain |
| 🌍 **Libre Acceso (Permissionless)** | Cualquier persona puede conectar su wallet y crear un evento sin intermediarios ni aprobaciones de terceros |
| 🔄 **QR Dinámico** | El código rota cada 30 segundos, eliminando las capturas de pantalla |
| ✅ **Check-in On-Chain** | El staff verifica la autenticidad con un scanner conectado a devnet |
| 🏆 **POAP Mutation** | Tras el evento, el ticket muta y se convierte en un coleccionable permanente |
| 🔒 **Escrow de Pagos** | Los fondos del comprador se retienen y solo se liberan tras check-ins reales |
| 📊 **Reputación On-Chain** | Los organizadores acumulan un puntaje público e inmutable |

## 🧱 Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend   │────▶│  Solana RPC   │────▶│  Devnet Cluster  │
│  React+Vite  │     │  (JSON-RPC)   │     │  (Validators)    │
└──────┬───────┘     └──────────────┘     └─────────────────┘
       │                                          │
       ▼                                          ▼
┌─────────────┐                          ┌─────────────────┐
│  Pinata SDK  │                          │  Metaplex Core   │
│  (IPFS JSON) │                          │  Collections &   │
└─────────────┘                          │  Assets (NFTs)   │
                                         └─────────────────┘
```

## 🛠️ Tech Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Blockchain** | Solana (Devnet) |
| **NFTs** | Metaplex Core (mpl-core) + UMI |
| **Wallet** | Solana Wallet Adapter (Phantom, Solflare, Backpack) |
| **Storage** | IPFS via Pinata (metadata JSON) |
| **Hosting** | Vercel |
| **Styling** | Vanilla CSS + Tailwind (híbrido) |
| **QR** | react-qr-code + html5-qrcode |

## 🚀 Ejecución Local

### Prerrequisitos
- Node.js 18+
- Una wallet de Solana (Phantom recomendado)
- SOL de devnet ([Faucet](https://faucet.solana.com))

### Instalación

```bash
cd template_codespaces
npm install
```

### Variables de Entorno

Crea un archivo `.env.local` en `template_codespaces/` con las credenciales necesarias. Consulta `.env.example` o contacta al equipo para obtener las llaves requeridas.

> Sin las variables configuradas, la app funciona en modo demo.

### Iniciar

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
Mintpass/
└── template_codespaces/
    ├── public/              # Assets estáticos (icon.png)
    ├── src/
    │   ├── components/      # Componentes reutilizables (AlertModal, PageNav)
    │   ├── data/            # Catálogo de eventos demo
    │   ├── lib/             # Lógica de blockchain
    │   │   ├── metaplex.ts  # Minteo NFT, POAP mutation, reputación
    │   │   ├── escrow.ts    # Custodia de pagos on-chain
    │   │   ├── event-pda.ts # PDAs de eventos
    │   │   ├── checkin-pda.ts # Sistema anti-duplicidad
    │   │   └── pinata.ts    # Upload a IPFS
    │   ├── pages/           # Vistas principales
    │   │   ├── Home.tsx           # Landing page
    │   │   ├── BuyerPurchase.tsx  # Compra de tickets
    │   │   ├── MyTicket.tsx       # QR dinámico + POAP
    │   │   ├── StaffPanel.tsx     # Scanner de check-in
    │   │   ├── CreateEvent.tsx    # Formulario de eventos
    │   │   ├── OrganizerDashboard.tsx
    │   │   ├── EventDetails.tsx
    │   │   └── TicketsList.tsx
    │   ├── providers/       # Wallet & UMI providers
    │   └── types/           # TypeScript interfaces
    └── anchor/              # Smart contracts (Rust/Anchor)
```

## 🗺️ Roadmap

- [ ] Integración de **Solana Blinks** para compra de tickets directamente desde Links
- [ ] Construcción avanzada del **sistema de reputación** para organizadores on-chain
- [ ] Implementación de un **sistema de verificación** descentralizado para organizadores verificados
- [ ] Manejo de control de reventa con **sistema de devoluciones** nativo

## Autores

### Equipo Mintpass
- [@Kaxeck](https://github.com/Kaxeck)
- [@josedejesusnietorangel-debug](https://github.com/josedejesusnietorangel-debug)
- [@legh27](https://github.com/legh27)

### Plantilla base
Proyecto construido sobre la plantilla de [@DvdRivas](https://github.com/DvdRivas).
