import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const profiles = await prisma.userProfile.findMany();
  console.log("Profiles in DB:", profiles);
}
main().finally(() => prisma.$disconnect());
