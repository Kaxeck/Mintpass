import { Program, Idl, BorshCoder } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { address, Address } from "@solana/kit";
import { Instruction, AccountRole } from "@solana/instructions";

// Minimal IDL matching mintpass-core for Frontend interactions
export const MINTPASS_IDL: any = {
  version: "0.1.0",
  name: "mintpass_core",
  address: process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID || "FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM",
  instructions: [
    {
      name: "createEvent",
      discriminator: [49, 219, 29, 203, 22, 98, 100, 87],
      accounts: [
        { name: "organizer", isMut: true, isSigner: true },
        { name: "collectionMint", isMut: false, isSigner: false },
        { name: "collectionMetadata", isMut: false, isSigner: false },
        { name: "eventRecord", isMut: true, isSigner: false },
        { name: "protocolConfig", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "eventTimestamp", type: "i64" },
        { name: "venue", type: "string" },
        { name: "category", type: "string" },
        {
          name: "zones",
          type: {
            vec: {
              defined: { name: "Zone" }
            }
          }
        },
        { name: "allowResale", type: "bool" },
        { name: "resaleCapLimit", type: "u16" },
        { name: "isSoulbound", type: "bool" },
        { name: "allowRefunds", type: "bool" },
        { name: "refundTimeLimit", type: "u16" },
        { name: "identityLimit", type: "u16" }
      ]
    },
    {
      name: "buyTicket",
      discriminator: [11, 24, 17, 193, 168, 116, 164, 169],
      accounts: [
        { name: "payer", isMut: true, isSigner: true },
        { name: "buyer", isMut: true, isSigner: true },
        { name: "ticketMint", isMut: true, isSigner: false },
        { name: "ticketReceipt", isMut: true, isSigner: false },
        { name: "protocolConfig", isMut: false, isSigner: false },
        { name: "mintpassTreasury", isMut: true, isSigner: false },
        { name: "whitelistRecord", isMut: false, isSigner: false, isOptional: true },
        { name: "escrowVault", isMut: true, isSigner: false },
        { name: "escrowState", isMut: true, isSigner: false },
        { name: "eventRecord", isMut: true, isSigner: false },
        { name: "tokenAccount", isMut: true, isSigner: false },
        { name: "ticketCounter", isMut: true, isSigner: false },
        { name: "ticketMetadata", isMut: false, isSigner: false },
        { name: "tokenProgram", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "zoneIndex", type: "u8" }
      ]
    },
    {
      "name": "perform_checkin",
      "discriminator": [120, 48, 197, 249, 18, 126, 237, 107],
      "accounts": [
        { "name": "protocolConfig", "isMut": false, "isSigner": false },
        { "name": "mintpassAuthority", "isMut": true, "isSigner": true },
        { "name": "ticketMint", "isMut": false, "isSigner": false },
        { "name": "tokenAccount", "isMut": false, "isSigner": false },
        { "name": "ticketReceipt", "isMut": true, "isSigner": false },
        { "name": "eventRecord", "isMut": false, "isSigner": false },
        { "name": "ticketMetadata", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "staffId", "type": "string" }
      ]
    }
  ],
  types: [
    {
      name: "Zone",
      type: {
        kind: "struct",
        fields: [
          { name: "name", type: "string" },
          { name: "capacity", type: "u32" },
          { name: "price", type: "u64" },
          { name: "ticketsSold", type: "u32" }
        ]
      }
    }
  ],
  errors: [
    { code: 6000, name: "Overflow", msg: "Error aritmético: overflow" },
    { code: 6001, name: "TicketPriceTooLow", msg: "El precio del boleto no cubre el fee mínimo" }
  ]
};

if (!process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID) throw new Error("Missing NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID");

export const EVENT_REGISTRY_PROGRAM_ID = address(process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID);

const coder = new BorshCoder(MINTPASS_IDL);

export function buildCreateEventInstruction(
  organizer: Address,
  collectionMint: Address,
  collectionMetadata: Address,
  eventRecord: Address,
  args: any
): Instruction {
  const data = coder.instruction.encode("createEvent", args);
  return {
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: organizer, role: AccountRole.WRITABLE_SIGNER },
      { address: collectionMint, role: AccountRole.READONLY },
      { address: collectionMetadata, role: AccountRole.READONLY },
      { address: eventRecord, role: AccountRole.WRITABLE },
      { address: address("config_pda_here"), role: AccountRole.READONLY }, // We need the correct PDA
      { address: address("11111111111111111111111111111111"), role: AccountRole.READONLY } // System program
    ],
    data: new Uint8Array(data)
  };
}

export function buildPerformCheckinInstruction(
  protocolConfig: Address,
  mintpassAuthority: Address,
  ticketMint: Address,
  tokenAccount: Address,
  ticketReceipt: Address,
  eventRecord: Address,
  ticketMetadata: Address,
  staffId: string
): Instruction {
  const data = coder.instruction.encode("perform_checkin", { staffId });
  return {
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: protocolConfig, role: AccountRole.READONLY },
      { address: mintpassAuthority, role: AccountRole.WRITABLE_SIGNER },
      { address: ticketMint, role: AccountRole.READONLY },
      { address: tokenAccount, role: AccountRole.READONLY },
      { address: ticketReceipt, role: AccountRole.WRITABLE },
      { address: eventRecord, role: AccountRole.READONLY },
      { address: ticketMetadata, role: AccountRole.READONLY },
      { address: address("11111111111111111111111111111111"), role: AccountRole.READONLY }
    ],
    data: new Uint8Array(data)
  };
}

const FETCH_IDL: any = {
  version: "0.1.0",
  name: "mintpass_core",
  address: process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID,
  instructions: [],
  accounts: [
    {
      name: "ticketReceipt",
      type: {
        kind: "struct",
        fields: [
          { name: "originalBuyer", type: "publicKey" },
          { name: "buyer", type: "publicKey" },
          { name: "ticketMint", type: "publicKey" },
          { name: "originalPrice", type: "u64" },
          { name: "pricePaid", type: "u64" },
          { name: "resalePrice", type: "u64" },
          { name: "status", type: { defined: { name: "TicketStatus" } } },
          { name: "zoneIndex", type: "u8" },
          { name: "eventRecord", type: "publicKey" },
          { name: "isCheckedIn", type: "bool" },
          { name: "checkinTimestamp", type: "i64" },
          { name: "checkinStaffId", type: "string" },
          { name: "resaleCount", type: "u8" }
        ]
      }
    },
    {
      name: "eventRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "organizer", type: "publicKey" },
          { name: "collectionMint", type: "publicKey" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "eventTimestamp", type: "i64" },
          { name: "venue", type: "string" },
          { name: "category", type: "string" },
          { name: "zones", type: { vec: { defined: { name: "Zone" } } } },
          { name: "allowResale", type: "bool" },
          { name: "resaleCapLimit", type: "u16" },
          { name: "isSoulbound", type: "bool" },
          { name: "allowRefunds", type: "bool" },
          { name: "refundTimeLimit", type: "u16" },
          { name: "identityLimit", type: "u16" },
          { name: "isActive", type: "bool" },
          { name: "wasCancelled", type: "bool" },
          { name: "createdAt", type: "i64" },
          { name: "closedAt", type: "i64" }
        ]
      }
    }
  ],
  types: [
    {
      name: "TicketStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Valid" },
          { name: "Used" },
          { name: "Listed" },
          { name: "Resold" },
          { name: "CheckedIn" },
          { name: "Cancelled" }
        ]
      }
    },
    {
      name: "Zone",
      type: {
        kind: "struct",
        fields: [
          { name: "name", type: "string" },
          { name: "capacity", type: "u32" },
          { name: "price", type: "u64" },
          { name: "ticketsSold", type: "u32" }
        ]
      }
    }
  ]
};

export async function fetchUserTickets(connection: Connection, userPubkey: PublicKey) {
  const provider = { connection } as any; 
  const program = new Program(FETCH_IDL as any, provider);
  
  try {
    const receipts = await (program.account as any).ticketReceipt.all([
      { memcmp: { offset: 40, bytes: userPubkey.toBase58() } }
    ]);
    return receipts;
  } catch (e) {
    console.warn("Could not fetch user tickets. Is the program deployed?", e);
    return [];
  }
}

export async function fetchEventRecord(connection: Connection, eventPubkey: PublicKey) {
  const provider = { connection } as any; 
  const program = new Program(FETCH_IDL as any, provider);
  try {
    return await (program.account as any).eventRecord.fetch(eventPubkey);
  } catch (e) {
    console.warn("Could not fetch event record", e);
    return null;
  }
}

