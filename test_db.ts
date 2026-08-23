import prisma from './src/lib/prisma';

async function main() {
  const event = await prisma.event.findUnique({
    where: { id: 'cmt6b7knn0001co9qcyl4brd5' }
  });
  console.log(JSON.stringify(event, null, 2));
}
main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
