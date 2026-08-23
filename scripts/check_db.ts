import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const event = await prisma.event.findUnique({
    where: { collectionMint: 'FHuWonqNTuJuaeenqNuWgzA1nYX7r8biMbTnmiGh9gj1' }
  })
  console.log(event?.status)
}
main()
