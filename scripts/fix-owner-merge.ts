/**
 * One-time fix: merge bootstrap_admin owned data onto the real Google user
 * with OWNER_EMAIL (or the email passed as argv).
 *
 * Usage: npx tsx scripts/fix-owner-merge.ts
 */
import { PrismaClient } from "@prisma/client";

const BOOTSTRAP_ID = "bootstrap_admin";

async function main() {
  const ownerEmail = (
    process.env.OWNER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "anujjbubna39@gmail.com"
  )
    .trim()
    .toLowerCase();

  const prisma = new PrismaClient();
  try {
    const bootstrap = await prisma.user.findUnique({ where: { id: BOOTSTRAP_ID } });
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });

    if (!bootstrap) {
      console.log("No bootstrap user — nothing to merge.");
      if (owner) {
        console.log(`Owner ${ownerEmail} exists with id=${owner.id}`);
      }
      return;
    }

    if (!owner) {
      // Just rename bootstrap to owner email
      await prisma.user.update({
        where: { id: BOOTSTRAP_ID },
        data: { email: ownerEmail, role: "USER", name: bootstrap.name ?? "Owner" },
      });
      console.log(`Renamed bootstrap to ${ownerEmail}. Sign in with Google again.`);
      return;
    }

    if (owner.id === BOOTSTRAP_ID) {
      console.log("Owner is already the bootstrap user.");
      return;
    }

    const people = await prisma.person.count({ where: { userId: BOOTSTRAP_ID } });
    console.log(
      `Merging ${people} people (+ related rows) from ${BOOTSTRAP_ID} → ${owner.id} (${ownerEmail})`,
    );

    await prisma.$transaction([
      prisma.person.updateMany({
        where: { userId: BOOTSTRAP_ID },
        data: { userId: owner.id },
      }),
      prisma.interaction.updateMany({
        where: { userId: BOOTSTRAP_ID },
        data: { userId: owner.id },
      }),
      prisma.chatMessage.updateMany({
        where: { userId: BOOTSTRAP_ID },
        data: { userId: owner.id },
      }),
      prisma.nudge.updateMany({
        where: { userId: BOOTSTRAP_ID },
        data: { userId: owner.id },
      }),
      prisma.llmUsage.updateMany({
        where: { userId: BOOTSTRAP_ID },
        data: { userId: owner.id },
      }),
      prisma.invite.updateMany({
        where: { createdById: BOOTSTRAP_ID },
        data: { createdById: owner.id },
      }),
      prisma.user.delete({ where: { id: BOOTSTRAP_ID } }),
    ]);

    const after = await prisma.person.count({ where: { userId: owner.id } });
    console.log(`Done. ${ownerEmail} now has ${after} people.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
