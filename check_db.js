const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
const prisma = new PrismaClient();

async function main() {
  const organizers = await prisma.organizer.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2
  });
  console.log("Últimos organizadores en DB:");
  console.log(JSON.stringify(organizers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
