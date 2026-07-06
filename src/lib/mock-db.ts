import { promises as fs } from 'fs';
import path from 'path';

export interface Ticket {
  id: string;
  eventId: number;
  userId: string;
  status: 'PENDING' | 'ACTIVE' | 'USED' | 'FROZEN';
  totpSecret?: string;
  nftMint?: string;
  purchaseMethod: 'CRYPTO' | 'FIAT';
  createdAt: string;
}

interface MockDB {
  tickets: Ticket[];
}

const dbPath = path.join(process.cwd(), 'src', 'data', 'mock-db.json');

async function ensureDB() {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify({ tickets: [] }, null, 2), 'utf-8');
  }
}

export async function readDB(): Promise<MockDB> {
  await ensureDB();
  const data = await fs.readFile(dbPath, 'utf-8');
  return JSON.parse(data) as MockDB;
}

export async function writeDB(data: MockDB): Promise<void> {
  await ensureDB();
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function createTicket(ticket: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
  const db = await readDB();
  const newTicket: Ticket = {
    ...ticket,
    id: `tk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  db.tickets.push(newTicket);
  await writeDB(db);
  return newTicket;
}

export async function updateTicketStatus(id: string, status: Ticket['status'], nftMint?: string): Promise<Ticket | null> {
  const db = await readDB();
  const ticketIndex = db.tickets.findIndex(t => t.id === id);
  if (ticketIndex === -1) return null;

  db.tickets[ticketIndex].status = status;
  if (nftMint) {
    db.tickets[ticketIndex].nftMint = nftMint;
  }
  
  await writeDB(db);
  return db.tickets[ticketIndex];
}

export async function getTicketsByUser(userId: string): Promise<Ticket[]> {
  const db = await readDB();
  return db.tickets.filter(t => t.userId === userId);
}
