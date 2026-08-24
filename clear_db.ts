import prisma from "./src/lib/prisma";

async function main() {
  await prisma.ticketAuditLog.deleteMany({});
  await prisma.ticket.deleteMany({});
  console.log('Tickets deleted.');
  await prisma.event.deleteMany({});
  console.log('Events deleted.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
