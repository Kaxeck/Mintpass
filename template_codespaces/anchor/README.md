# Mintpass — Smart Contracts (Anchor/Rust)

Contratos inteligentes de Solana que soportan la lógica de negocio on-chain de Mintpass.

## Programas

| Programa | Program ID | Función |
|----------|-----------|---------|
| **Event Registry** | `9inMKT4XXyRApVDDFGPQr9kcdWnuCk5YKJiDT8pTbtNj` | Almacena metadatos de eventos en PDAs |
| **Escrow** | `8NRJJTedLMqMVsZyFTzf3zKeHwgaSywmcTYsjVjB4kQz` | Custodia de pagos SOL del comprador |
| **Check-in** | `Dm5EGnhPWU1MGJNYRwfetzPTojSM9g1yJEAdd9bPdqTf` | Registro anti-duplicidad de accesos |
| **Reputation** | `79i2AbYFRQUj5gSStpvoJ51QSYcSwcN3dp6Jyrv13g6j` | Puntaje inmutable de organizadores |

## Red

Todos los programas están desplegados en **Solana Devnet**.

## Cómo construir

```bash
anchor build
anchor deploy --provider.cluster devnet
```

## Arquitectura de PDAs

```
Event PDA:      ["event", organizer_pubkey, collection_mint]
Escrow PDA:     ["escrow", mint_buffer]
Check-in PDA:   ["checkin", ticket_mint]
Reputation PDA: ["reputation", organizer_pubkey]
```
