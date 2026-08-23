import { Program, Idl, BorshCoder } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { address, Address } from "@solana/kit";
import { Instruction, AccountRole } from "@solana/instructions";

// Minimal IDL matching mintpass-core for Frontend interactions
export const MINTPASS_IDL: any = {
  address: process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID || "FTZot8vUVk4Ez7FTdakSqnNoEabysQbBW7GuAdr2EwFM",
  metadata: {
    name: "mintpass_core",
    version: "0.1.0",
    spec: "0.1.0",
    description:
      "Programa Core para Mintpass — Maneja metadata de eventos y reputación de organizadores",
  },
  instructions: [
    {
      name: "authorize_organizer",
      discriminator: [113, 150, 73, 94, 163, 22, 235, 152],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_authority",
          writable: true,
          signer: true,
        },
        {
          name: "organizer",
        },
        {
          name: "whitelist_record",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [119, 104, 105, 116, 101, 108, 105, 115, 116],
              },
              {
                kind: "account",
                path: "organizer",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "is_authorized",
          type: "bool",
        },
      ],
    },
    {
      name: "buy_resale",
      discriminator: [71, 230, 159, 123, 90, 231, 111, 104],
      accounts: [
        {
          name: "buyer",
          writable: true,
          signer: true,
        },
        {
          name: "seller",
          writable: true,
        },
        {
          name: "ticket_receipt",
          writable: true,
        },
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_treasury",
          writable: true,
        },
        {
          name: "event_record",
        },
        {
          name: "escrow_state",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "ticket_mint",
          writable: true,
        },
        {
          name: "ticket_counter",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 117, 110, 116, 101, 114],
              },
              {
                kind: "account",
                path: "event_record",
              },
              {
                kind: "account",
                path: "buyer",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
        {
          name: "mpl_core_program",
          address: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
        },
      ],
      args: [],
    },
    {
      name: "buy_ticket",
      discriminator: [11, 24, 17, 193, 168, 116, 164, 169],
      accounts: [
        {
          name: "payer",
          writable: true,
          signer: true,
        },
        {
          name: "buyer",
          writable: true,
          signer: true,
        },
        {
          name: "ticket_mint",
          writable: true,
          signer: true,
        },
        {
          name: "ticket_receipt",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 99, 101, 105, 112, 116],
              },
              {
                kind: "account",
                path: "ticket_mint",
              },
            ],
          },
        },
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_treasury",
          writable: true,
        },
        {
          name: "whitelist_record",
          optional: true,
        },
        {
          name: "event_record",
          writable: true,
        },
        {
          name: "escrow_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 115, 99, 114, 111, 119],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "escrow_state",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "ticket_counter",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 117, 110, 116, 101, 114],
              },
              {
                kind: "account",
                path: "event_record",
              },
              {
                kind: "account",
                path: "buyer",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
        {
          name: "mpl_core_program",
          address: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
        },
        {
          name: "collection_mint",
          writable: true,
        },
      ],
      args: [
        {
          name: "zone_index",
          type: "u8",
        },
        {
          name: "ticket_uri",
          type: "string",
        },
      ],
    },
    {
      name: "cancel_event",
      discriminator: [55, 143, 36, 45, 59, 241, 89, 119],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "authority",
          writable: true,
          signer: true,
        },
        {
          name: "organizer",
        },
        {
          name: "collection_mint",
        },
        {
          name: "event_record",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 118, 101, 110, 116],
              },
              {
                kind: "account",
                path: "organizer",
              },
              {
                kind: "account",
                path: "collection_mint",
              },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "create_event",
      discriminator: [49, 219, 29, 203, 22, 98, 100, 87],
      accounts: [
        {
          name: "organizer",
          writable: true,
          signer: true,
        },
        {
          name: "collection_mint",
        },
        {
          name: "event_record",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 118, 101, 110, 116],
              },
              {
                kind: "account",
                path: "organizer",
              },
              {
                kind: "account",
                path: "collection_mint",
              },
            ],
          },
        },
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "event_timestamp",
          type: "i64",
        },
        {
          name: "venue",
          type: "string",
        },
        {
          name: "category",
          type: "string",
        },
        {
          name: "zones",
          type: {
            vec: {
              defined: {
                name: "Zone",
              },
            },
          },
        },
        {
          name: "allow_resale",
          type: "bool",
        },
        {
          name: "resale_cap_limit",
          type: "u16",
        },
        {
          name: "is_soulbound",
          type: "bool",
        },
        {
          name: "allow_refunds",
          type: "bool",
        },
        {
          name: "refund_time_limit",
          type: "u16",
        },
        {
          name: "identity_limit",
          type: "u16",
        },
      ],
    },
    {
      name: "delist_ticket",
      discriminator: [151, 225, 116, 144, 187, 23, 171, 253],
      accounts: [
        {
          name: "seller",
          writable: true,
          signer: true,
        },
        {
          name: "ticket_receipt",
          writable: true,
        },
        {
          name: "event_record",
        },
        {
          name: "escrow_state",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "ticket_mint",
          writable: true,
        },
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mpl_core_program",
          address: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "finish_event_successfully",
      discriminator: [186, 47, 169, 208, 158, 115, 229, 217],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "authority",
          writable: true,
          signer: true,
        },
        {
          name: "organizer",
        },
        {
          name: "collection_mint",
        },
        {
          name: "event_record",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 118, 101, 110, 116],
              },
              {
                kind: "account",
                path: "organizer",
              },
              {
                kind: "account",
                path: "collection_mint",
              },
            ],
          },
        },
      ],
      args: [],
    },
    {
      name: "force_refund",
      discriminator: [127, 173, 30, 92, 164, 123, 109, 177],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_authority",
          writable: true,
          signer: true,
        },
        {
          name: "current_owner",
          writable: true,
        },
        {
          name: "ticket_receipt",
          writable: true,
        },
        {
          name: "event_record",
          writable: true,
        },
        {
          name: "escrow_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 115, 99, 114, 111, 119],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "escrow_state",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "ticket_mint",
          writable: true,
        },
        {
          name: "ticket_counter",
          writable: true,
          optional: true,
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
        {
          name: "mpl_core_program",
          address: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
        },
      ],
      args: [],
    },
    {
      name: "force_thaw",
      discriminator: [30, 200, 83, 223, 171, 48, 252, 244],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_authority",
          writable: true,
          signer: true,
        },
        {
          name: "ticket_mint",
          writable: true,
        },
        {
          name: "ticket_receipt",
        },
        {
          name: "escrow_state",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "event_record",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "initialize_escrow",
      discriminator: [243, 160, 77, 153, 11, 92, 48, 209],
      accounts: [
        {
          name: "organizer",
          writable: true,
          signer: true,
        },
        {
          name: "event_record",
        },
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_treasury",
          writable: true,
        },
        {
          name: "escrow_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 115, 99, 114, 111, 119],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "escrow_state",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "platform_fee",
          type: "u64",
        },
      ],
    },
    {
      name: "initialize_protocol",
      discriminator: [188, 233, 252, 106, 134, 146, 202, 91],
      accounts: [
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "protocol_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "authority",
          type: "pubkey",
        },
        {
          name: "treasury",
          type: "pubkey",
        },
      ],
    },
    {
      name: "initialize_reputation",
      discriminator: [150, 240, 109, 53, 147, 42, 152, 162],
      accounts: [
        {
          name: "organizer",
          writable: true,
          signer: true,
        },
        {
          name: "reputation",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [114, 101, 112, 117, 116, 97, 116, 105, 111, 110],
              },
              {
                kind: "account",
                path: "organizer",
              },
            ],
          },
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "list_ticket",
      discriminator: [11, 213, 240, 45, 246, 35, 44, 162],
      accounts: [
        {
          name: "seller",
          writable: true,
          signer: true,
        },
        {
          name: "ticket_receipt",
          writable: true,
        },
        {
          name: "event_record",
        },
        {
          name: "escrow_state",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "ticket_mint",
          writable: true,
        },
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mpl_core_program",
          address: "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "resale_price",
          type: "u64",
        },
      ],
    },
    {
      name: "perform_checkin",
      discriminator: [120, 48, 197, 249, 18, 126, 237, 107],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "mintpass_authority",
          writable: true,
          signer: true,
        },
        {
          name: "ticket_mint",
        },
        {
          name: "ticket_receipt",
          writable: true,
        },
        {
          name: "event_record",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [
        {
          name: "staff_id",
          type: "string",
        },
      ],
    },
    {
      name: "release_escrow",
      discriminator: [146, 253, 129, 233, 20, 145, 181, 206],
      accounts: [
        {
          name: "protocol_config",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
        {
          name: "organizer",
          writable: true,
          signer: true,
        },
        {
          name: "escrow_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [101, 115, 99, 114, 111, 119],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "escrow_state",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  101, 115, 99, 114, 111, 119, 95, 115, 116, 97, 116, 101,
                ],
              },
              {
                kind: "account",
                path: "event_record",
              },
            ],
          },
        },
        {
          name: "event_record",
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111",
        },
      ],
      args: [],
    },
    {
      name: "toggle_pause",
      discriminator: [238, 237, 206, 27, 255, 95, 123, 229],
      accounts: [
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "protocol_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "is_paused",
          type: "bool",
        },
      ],
    },
    {
      name: "update_protocol_config",
      discriminator: [197, 97, 123, 54, 221, 168, 11, 135],
      accounts: [
        {
          name: "admin",
          writable: true,
          signer: true,
        },
        {
          name: "protocol_config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [99, 111, 110, 102, 105, 103],
              },
            ],
          },
        },
      ],
      args: [
        {
          name: "new_authority",
          type: "pubkey",
        },
        {
          name: "new_treasury",
          type: "pubkey",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "BaseAssetV1",
      discriminator: [1],
    },
    {
      name: "BaseCollectionV1",
      discriminator: [5],
    },
    {
      name: "EscrowState",
      discriminator: [19, 90, 148, 111, 55, 130, 229, 108],
    },
    {
      name: "EventRecord",
      discriminator: [150, 209, 156, 235, 9, 198, 56, 184],
    },
    {
      name: "ProtocolConfig",
      discriminator: [207, 91, 250, 28, 152, 179, 215, 209],
    },
    {
      name: "ReputationProfile",
      discriminator: [73, 32, 193, 201, 177, 91, 104, 136],
    },
    {
      name: "TicketCounter",
      discriminator: [207, 43, 233, 62, 60, 187, 45, 197],
    },
    {
      name: "TicketReceipt",
      discriminator: [33, 39, 194, 207, 210, 208, 161, 103],
    },
    {
      name: "WhitelistRecord",
      discriminator: [212, 112, 61, 182, 76, 232, 45, 46],
    },
  ],
  events: [
    {
      name: "EscrowReleased",
      discriminator: [131, 7, 138, 104, 166, 190, 113, 112],
    },
    {
      name: "EventClosed",
      discriminator: [136, 138, 5, 113, 129, 202, 80, 85],
    },
    {
      name: "EventCreated",
      discriminator: [59, 186, 199, 175, 242, 25, 238, 94],
    },
    {
      name: "OrganizerAuthorized",
      discriminator: [102, 170, 81, 35, 140, 242, 88, 161],
    },
    {
      name: "TicketBought",
      discriminator: [80, 244, 35, 181, 211, 143, 3, 166],
    },
    {
      name: "TicketCheckedIn",
      discriminator: [189, 153, 33, 70, 49, 155, 13, 212],
    },
    {
      name: "TicketDelisted",
      discriminator: [197, 42, 58, 29, 147, 199, 69, 184],
    },
    {
      name: "TicketListed",
      discriminator: [104, 201, 254, 122, 120, 162, 118, 153],
    },
    {
      name: "TicketRefunded",
      discriminator: [46, 173, 213, 43, 145, 205, 132, 218],
    },
    {
      name: "TicketResold",
      discriminator: [123, 117, 228, 225, 190, 75, 239, 229],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "Overflow",
      msg: "Error aritmético: overflow",
    },
    {
      code: 6001,
      name: "TicketPriceTooLow",
      msg: "El precio del boleto no cubre el fee mínimo",
    },
    {
      code: 6002,
      name: "RefundsNotAllowed",
      msg: "Los reembolsos no están habilitados para este evento",
    },
    {
      code: 6003,
      name: "NameTooLong",
      msg: "El nombre del evento excede el límite",
    },
    {
      code: 6004,
      name: "DescriptionTooLong",
      msg: "La descripción del evento excede el límite",
    },
    {
      code: 6005,
      name: "VenueTooLong",
      msg: "El venue/lugar excede el límite",
    },
    {
      code: 6006,
      name: "CategoryTooLong",
      msg: "La categoría excede el límite",
    },
    {
      code: 6007,
      name: "ExceedsCapacity",
      msg: "La cantidad de tickets vendidos excede el aforo de la zona",
    },
    {
      code: 6008,
      name: "EventAlreadyClosed",
      msg: "El evento ya fue cerrado",
    },
    {
      code: 6009,
      name: "EventNotClosed",
      msg: "El evento no ha sido cerrado aún",
    },
    {
      code: 6010,
      name: "RefundWindowNotPassed",
      msg: "Aún no expira la ventana de reembolso",
    },
    {
      code: 6011,
      name: "Unauthorized",
      msg: "No tienes autorización para realizar esta acción",
    },
    {
      code: 6012,
      name: "UnauthorizedStaff",
      msg: "Staff no autorizado para realizar check-in",
    },
    {
      code: 6013,
      name: "NoZonesProvided",
      msg: "Debes proveer al menos una zona para el evento",
    },
    {
      code: 6014,
      name: "TooManyZones",
      msg: "Demasiadas zonas proveídas",
    },
    {
      code: 6015,
      name: "InvalidZoneCapacity",
      msg: "La capacidad de la zona debe ser mayor a 0",
    },
    {
      code: 6016,
      name: "InvalidZoneIndex",
      msg: "El índice de la zona es inválido",
    },
    {
      code: 6017,
      name: "InvalidRefundWindow",
      msg: "La ventana de reembolso debe ser de al menos 1 día",
    },
    {
      code: 6018,
      name: "InvalidTreasury",
      msg: "Tesorería inválida",
    },
    {
      code: 6019,
      name: "AlreadyReleased",
      msg: "Los fondos del escrow ya fueron liberados",
    },
    {
      code: 6020,
      name: "EventAlreadyCompleted",
      msg: "El evento ya se completó exitosamente",
    },
    {
      code: 6021,
      name: "EventCancelled",
      msg: "El evento fue cancelado, los fondos están bloqueados para reembolso",
    },
    {
      code: 6022,
      name: "InsufficientFunds",
      msg: "La bóveda no tiene fondos suficientes",
    },
    {
      code: 6023,
      name: "OrganizerNotWhitelisted",
      msg: "Este organizador no está en la Whitelist",
    },
    {
      code: 6024,
      name: "InvalidTicketState",
      msg: "El estado actual del ticket no permite esta operación",
    },
    {
      code: 6025,
      name: "TicketIsSoulbound",
      msg: "Este boleto es soulbound y no se puede transferir",
    },
    {
      code: 6026,
      name: "InvalidTicket",
      msg: "El ticket escaneado no coincide con el recibo",
    },
    {
      code: 6027,
      name: "ResaleNotAllowed",
      msg: "La reventa no está permitida para este evento",
    },
    {
      code: 6028,
      name: "InvalidResalePrice",
      msg: "El precio de reventa debe ser mayor a 0",
    },
    {
      code: 6029,
      name: "ExceedsResaleCap",
      msg: "El precio excede el límite máximo de reventa",
    },
    {
      code: 6030,
      name: "AlreadyCheckedIn",
      msg: "Este boleto ya fue registrado en la puerta",
    },
    {
      code: 6031,
      name: "EventAlreadyStarted",
      msg: "El evento ya ha comenzado o pasado",
    },
    {
      code: 6032,
      name: "InvalidCollection",
      msg: "El token no pertenece a la colección oficial",
    },
    {
      code: 6033,
      name: "IdentityLimitExceeded",
      msg: "Has excedido el límite de boletos permitidos",
    },
    {
      code: 6034,
      name: "InvalidFreezeAuthority",
      msg: "Freeze Authority inválido o ausente en el Mint",
    },
    {
      code: 6035,
      name: "EventNotStarted",
      msg: "El evento no ha comenzado aún",
    },
    {
      code: 6036,
      name: "DuplicateZoneName",
      msg: "Hay zonas con nombres duplicados",
    },
    {
      code: 6037,
      name: "ResalePriceTooLow",
      msg: "El precio de reventa no cubre el fee mínimo de la plataforma",
    },
    {
      code: 6038,
      name: "InvalidMetadata",
      msg: "El metadata proporcionado no coincide con el Mint",
    },
    {
      code: 6039,
      name: "InvalidResaleCap",
      msg: "El límite de reventa excede el máximo permitido",
    },
    {
      code: 6040,
      name: "ProtocolPaused",
      msg: "El protocolo está pausado",
    },
    {
      code: 6041,
      name: "MaxResalesReached",
      msg: "Este boleto ya alcanzó el límite máximo de reventas (2)",
    },
    {
      code: 6042,
      name: "RefundWindowExpired",
      msg: "La ventana de reembolso para este evento ya expiró",
    },
    {
      code: 6043,
      name: "InvalidFee",
      msg: "El fee proporcionado es inválido o menor al mínimo requerido",
    },
    {
      code: 6044,
      name: "InvalidMintAuthority",
      msg: "Mint Authority inválido o ausente en el Mint",
    },
  ],
  types: [
    {
      name: "BaseAssetV1",
      type: {
        kind: "struct",
        fields: [
          {
            name: "key",
            type: {
              defined: {
                name: "Key",
              },
            },
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "update_authority",
            type: {
              defined: {
                name: "UpdateAuthority",
              },
            },
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "uri",
            type: "string",
          },
          {
            name: "seq",
            type: {
              option: "u64",
            },
          },
        ],
      },
    },
    {
      name: "BaseCollectionV1",
      type: {
        kind: "struct",
        fields: [
          {
            name: "key",
            type: {
              defined: {
                name: "Key",
              },
            },
          },
          {
            name: "update_authority",
            type: "pubkey",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "uri",
            type: "string",
          },
          {
            name: "num_minted",
            type: "u32",
          },
          {
            name: "current_size",
            type: "u32",
          },
        ],
      },
    },
    {
      name: "EscrowReleased",
      type: {
        kind: "struct",
        fields: [
          {
            name: "event_record",
            type: "pubkey",
          },
          {
            name: "organizer",
            type: "pubkey",
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "EscrowState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "organizer",
            type: "pubkey",
          },
          {
            name: "event_record",
            type: "pubkey",
          },
          {
            name: "tickets_sold",
            type: "u32",
          },
          {
            name: "is_completed",
            type: "bool",
          },
          {
            name: "created_at",
            type: "i64",
          },
          {
            name: "vault_bump",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "EventClosed",
      type: {
        kind: "struct",
        fields: [
          {
            name: "event_record",
            type: "pubkey",
          },
          {
            name: "was_cancelled",
            type: "bool",
          },
          {
            name: "closed_at",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "EventCreated",
      type: {
        kind: "struct",
        fields: [
          {
            name: "organizer",
            type: "pubkey",
          },
          {
            name: "event_record",
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "EventRecord",
      type: {
        kind: "struct",
        fields: [
          {
            name: "organizer",
            type: "pubkey",
          },
          {
            name: "collection_mint",
            type: "pubkey",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "description",
            type: "string",
          },
          {
            name: "event_timestamp",
            type: "i64",
          },
          {
            name: "venue",
            type: "string",
          },
          {
            name: "category",
            type: "string",
          },
          {
            name: "zones",
            type: {
              vec: {
                defined: {
                  name: "Zone",
                },
              },
            },
          },
          {
            name: "allow_resale",
            type: "bool",
          },
          {
            name: "resale_cap_limit",
            type: "u16",
          },
          {
            name: "is_soulbound",
            type: "bool",
          },
          {
            name: "allow_refunds",
            type: "bool",
          },
          {
            name: "refund_time_limit",
            type: "u16",
          },
          {
            name: "identity_limit",
            type: "u16",
          },
          {
            name: "is_active",
            type: "bool",
          },
          {
            name: "was_cancelled",
            type: "bool",
          },
          {
            name: "created_at",
            type: "i64",
          },
          {
            name: "closed_at",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "Key",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Uninitialized",
          },
          {
            name: "AssetV1",
          },
          {
            name: "HashedAssetV1",
          },
          {
            name: "PluginHeaderV1",
          },
          {
            name: "PluginRegistryV1",
          },
          {
            name: "CollectionV1",
          },
          {
            name: "GroupV1",
          },
        ],
      },
    },
    {
      name: "OrganizerAuthorized",
      type: {
        kind: "struct",
        fields: [
          {
            name: "organizer",
            type: "pubkey",
          },
          {
            name: "authorized",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "ProtocolConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "pubkey",
          },
          {
            name: "treasury",
            type: "pubkey",
          },
          {
            name: "is_paused",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "ReputationProfile",
      type: {
        kind: "struct",
        fields: [
          {
            name: "organizer",
            type: "pubkey",
          },
          {
            name: "score",
            type: "u64",
          },
          {
            name: "total_events",
            type: "u64",
          },
          {
            name: "successful_events",
            type: "u64",
          },
          {
            name: "cancelled_events",
            type: "u64",
          },
          {
            name: "created_at",
            type: "i64",
          },
          {
            name: "last_updated",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "TicketBought",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "buyer",
            type: "pubkey",
          },
          {
            name: "original_price",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "TicketCheckedIn",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "staff_id",
            type: "string",
          },
          {
            name: "timestamp",
            type: "i64",
          },
        ],
      },
    },
    {
      name: "TicketCounter",
      type: {
        kind: "struct",
        fields: [
          {
            name: "count",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "TicketDelisted",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "seller",
            type: "pubkey",
          },
        ],
      },
    },
    {
      name: "TicketListed",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "seller",
            type: "pubkey",
          },
          {
            name: "resale_price",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "TicketReceipt",
      type: {
        kind: "struct",
        fields: [
          {
            name: "original_buyer",
            type: "pubkey",
          },
          {
            name: "buyer",
            type: "pubkey",
          },
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "original_price",
            type: "u64",
          },
          {
            name: "price_paid",
            type: "u64",
          },
          {
            name: "resale_price",
            type: "u64",
          },
          {
            name: "status",
            type: {
              defined: {
                name: "TicketStatus",
              },
            },
          },
          {
            name: "zone_index",
            type: "u8",
          },
          {
            name: "event_record",
            type: "pubkey",
          },
          {
            name: "is_checked_in",
            type: "bool",
          },
          {
            name: "checkin_timestamp",
            type: "i64",
          },
          {
            name: "checkin_staff_id",
            type: "string",
          },
          {
            name: "resale_count",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "TicketRefunded",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "owner",
            type: "pubkey",
          },
          {
            name: "amount",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "TicketResold",
      type: {
        kind: "struct",
        fields: [
          {
            name: "ticket_mint",
            type: "pubkey",
          },
          {
            name: "seller",
            type: "pubkey",
          },
          {
            name: "buyer",
            type: "pubkey",
          },
          {
            name: "new_price",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "TicketStatus",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Valid",
          },
          {
            name: "CheckedIn",
          },
          {
            name: "Refunded",
          },
          {
            name: "Listed",
          },
          {
            name: "Resold",
          },
          {
            name: "Cancelled",
          },
        ],
      },
    },
    {
      name: "UpdateAuthority",
      type: {
        kind: "enum",
        variants: [
          {
            name: "None",
          },
          {
            name: "Address",
            fields: ["pubkey"],
          },
          {
            name: "Collection",
            fields: ["pubkey"],
          },
        ],
      },
    },
    {
      name: "WhitelistRecord",
      type: {
        kind: "struct",
        fields: [
          {
            name: "is_authorized",
            type: "bool",
          },
        ],
      },
    },
    {
      name: "Zone",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "capacity",
            type: "u32",
          },
          {
            name: "price",
            type: "u64",
          },
          {
            name: "tickets_sold",
            type: "u32",
          },
        ],
      },
    },
  ],
};

if (!process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID)
  throw new Error("Missing NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID");

export const EVENT_REGISTRY_PROGRAM_ID = address(
  process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID,
);

const coder = new BorshCoder(MINTPASS_IDL);

export function buildCreateEventInstruction(
  organizer: Address,
  collectionMint: Address,
  collectionMetadata: Address,
  eventRecord: Address,
  args: any,
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
      {
        address: address("11111111111111111111111111111111"),
        role: AccountRole.READONLY,
      }, // System program
    ],
    data: new Uint8Array(data),
  };
}

export function buildPerformCheckinInstruction(
  protocolConfig: Address,
  mintpassAuthority: Address,
  ticketMint: Address,
  ticketReceipt: Address,
  eventRecord: Address,
  staffId: string,
): Instruction {
  const data = coder.instruction.encode("perform_checkin", { staff_id: staffId });
  return {
    programAddress: EVENT_REGISTRY_PROGRAM_ID,
    accounts: [
      { address: protocolConfig, role: AccountRole.READONLY },
      { address: mintpassAuthority, role: AccountRole.WRITABLE_SIGNER },
      { address: ticketMint, role: AccountRole.READONLY },
      { address: ticketReceipt, role: AccountRole.WRITABLE },
      { address: eventRecord, role: AccountRole.READONLY },
      {
        address: address("11111111111111111111111111111111"),
        role: AccountRole.READONLY,
      },
    ],
    data: new Uint8Array(data),
  };
}

const FETCH_IDL: any = {
  version: "0.1.0",
  name: "mintpass_core",
  address: process.env.NEXT_PUBLIC_EVENT_REGISTRY_PROGRAM_ID,
  instructions: [],
  accounts: [
    {
      name: "TicketReceipt",
      discriminator: [33, 39, 194, 207, 210, 208, 161, 103],
    },
    {
      name: "EventRecord",
      discriminator: [150, 209, 156, 235, 9, 198, 56, 184],
    },
  ],
  types: [
    {
      name: "TicketReceipt",
      type: {
        kind: "struct",
        fields: [
          { name: "originalBuyer", type: "pubkey" },
          { name: "buyer", type: "pubkey" },
          { name: "ticketMint", type: "pubkey" },
          { name: "originalPrice", type: "u64" },
          { name: "pricePaid", type: "u64" },
          { name: "resalePrice", type: "u64" },
          { name: "status", type: { defined: { name: "TicketStatus" } } },
          { name: "zoneIndex", type: "u8" },
          { name: "eventRecord", type: "pubkey" },
          { name: "isCheckedIn", type: "bool" },
          { name: "checkinTimestamp", type: "i64" },
          { name: "checkinStaffId", type: "string" },
          { name: "resaleCount", type: "u8" },
        ],
      },
    },
    {
      name: "EventRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "organizer", type: "pubkey" },
          { name: "collectionMint", type: "pubkey" },
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
          { name: "closedAt", type: "i64" },
        ],
      },
    },
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
          { name: "Cancelled" },
        ],
      },
    },
    {
      name: "Zone",
      type: {
        kind: "struct",
        fields: [
          { name: "name", type: "string" },
          { name: "capacity", type: "u32" },
          { name: "price", type: "u64" },
          { name: "ticketsSold", type: "u32" },
        ],
      },
    },
  ],
};

export async function fetchUserTickets(
  connection: Connection,
  userPubkey: PublicKey,
) {
  const provider = { connection } as any;
  const program = new Program(MINTPASS_IDL as any, provider);

  try {
    const receipts = await (program.account as any).ticketReceipt.all([
      { memcmp: { offset: 40, bytes: userPubkey.toBase58() } },
    ]);
    return receipts;
  } catch (e) {
    console.warn("Could not fetch user tickets. Is the program deployed?", e);
    return [];
  }
}

export async function fetchEventRecord(
  connection: Connection,
  eventPubkey: PublicKey,
) {
  const provider = { connection } as any;
  const program = new Program(MINTPASS_IDL as any, provider);
  try {
    return await (program.account as any).eventRecord.fetch(eventPubkey);
  } catch (e) {
    console.warn("Could not fetch event record", e);
    return null;
  }
}
