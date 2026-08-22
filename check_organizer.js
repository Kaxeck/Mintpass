const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const organizers = await prisma.organizer.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log("Último organizador creado:");
  console.log(JSON.stringify(organizers, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
