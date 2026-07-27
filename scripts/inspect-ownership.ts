import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
        _count: { select: { people: true, chatMessages: true, accounts: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const peopleTotal = await prisma.person.count();
    const peopleByUser = await prisma.person.groupBy({
      by: ["userId"],
      _count: { _all: true },
    });
    const accounts = await prisma.account.findMany({
      select: { userId: true, provider: true, providerAccountId: true },
    });
    console.log(
      JSON.stringify({ peopleTotal, users, peopleByUser, accounts }, null, 2),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
