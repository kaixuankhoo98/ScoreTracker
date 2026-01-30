import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default sports
  const sports = [
    {
      name: 'Basketball',
      slug: 'basketball',
      description: 'Standard basketball with quarters',
      periods: 4,
      periodName: 'Quarter',
      scoreIncrements: [1, 2, 3],
      scoreLabels: ['Free Throw', '2-Point', '3-Point'],
      pointsToWinPeriod: null,
      canTie: false,
      icon: 'basketball',
    },
    {
      name: 'Volleyball',
      slug: 'volleyball',
      description: 'Standard volleyball with sets (best of 5)',
      periods: 5,
      periodName: 'Set',
      scoreIncrements: [1],
      scoreLabels: ['Point'],
      pointsToWinPeriod: 25, // 15 for final set, handled in logic
      canTie: false,
      icon: 'circle-dot',
    },
    {
      name: 'Soccer',
      slug: 'soccer',
      description: 'Standard soccer with two halves',
      periods: 2,
      periodName: 'Half',
      scoreIncrements: [1],
      scoreLabels: ['Goal'],
      pointsToWinPeriod: null,
      canTie: true,
      icon: 'circle',
    },
    {
      name: 'Tennis',
      slug: 'tennis',
      description: 'Tennis with sets (best of 3 or 5)',
      periods: 5,
      periodName: 'Set',
      scoreIncrements: [1],
      scoreLabels: ['Game'],
      pointsToWinPeriod: 6,
      canTie: false,
      icon: 'circle-dot',
    },
    {
      name: 'Table Tennis',
      slug: 'table-tennis',
      description: 'Table tennis with games (best of 5 or 7)',
      periods: 7,
      periodName: 'Game',
      scoreIncrements: [1],
      scoreLabels: ['Point'],
      pointsToWinPeriod: 11,
      canTie: false,
      icon: 'circle-dot',
    },
    {
      name: 'Badminton',
      slug: 'badminton',
      description: 'Badminton with games (best of 3)',
      periods: 3,
      periodName: 'Game',
      scoreIncrements: [1],
      scoreLabels: ['Point'],
      pointsToWinPeriod: 21,
      canTie: false,
      icon: 'feather',
    },
  ]

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: { slug: sport.slug },
      update: sport,
      create: sport,
    })
  }

  console.log('Seeded sports:', sports.map((s) => s.name).join(', '))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
