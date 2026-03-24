# Mintpass — Frontend

Aplicación web construida con **React 18 + TypeScript + Vite** que sirve como el cliente conectado a la blockchain de Solana.

## Inicio rápido

```bash
npm install
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_PINATA_API_KEY` | API Key de Pinata para subir metadata a IPFS |
| `VITE_PINATA_SECRET_KEY` | Secret Key de Pinata |

## Módulos principales

| Archivo | Responsabilidad |
|---------|----------------|
| `lib/metaplex.ts` | Creación de colecciones NFT, minteo de tickets, mutación a POAP |
| `lib/escrow.ts` | Custodia de pagos SOL en bóveda on-chain |
| `lib/event-pda.ts` | Lectura/escritura de datos de evento en PDAs de Solana |
| `lib/checkin-pda.ts` | Verificación anti-duplicidad para check-in de asistentes |
| `lib/pinata.ts` | Upload de metadata JSON e imágenes a IPFS |

## Despliegue

El frontend se despliega en Vercel. Las variables de entorno deben configurarse en el panel de Vercel antes del deploy.
