import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder } from "@coral-xyz/anchor";
import fs from "fs";

async function checkEvent() {
  const EVENT_PDA = "4E5xi8uPrjt1LkmrKBVXwCzjAHNT4FnoCEhJQLE9TyAJ";
  console.log(`Verificando datos en Solana Devnet para el PDA: ${EVENT_PDA}...`);
  
  const connection = new Connection("https://api.devnet.solana.com");
  const info = await connection.getAccountInfo(new PublicKey(EVENT_PDA));
  
  if (!info) {
    console.log("❌ No se encontró la cuenta en Devnet. Verifica la dirección.");
    return;
  }
  
  console.log(`✅ Cuenta encontrada. Tamaño en bytes: ${info.data.length}`);
  
  const idlString = fs.readFileSync("./full_idl.json", "utf8");
  const idl = JSON.parse(idlString);
  const coder = new BorshCoder(idl);
  
  try {
    const decoded = coder.accounts.decode("EventRecord", info.data);
    
    // Serializando BigInts y BN para que JSON.stringify no falle
    const serialized = JSON.stringify(decoded, (key, value) => {
      if (typeof value === 'bigint' || (value && value.type === 'Buffer')) return value.toString();
      if (value && value.toNumber) return value.toNumber(); 
      if (value && value.toBase58) return value.toBase58(); // Pubkey
      return value;
    }, 2);

    console.log("\n📦 Datos guardados en la Blockchain (Descodificados):");
    console.log(serialized);
    
    // Convertir timestamp a fecha legible
    if (decoded.eventTimestamp) {
       console.log(`\n🗓️ Fecha del evento: ${new Date(decoded.eventTimestamp.toNumber() * 1000).toLocaleString()}`);
    }

  } catch (e) {
    console.log("❌ Error al decodificar la data:", e);
  }
}

checkEvent();
