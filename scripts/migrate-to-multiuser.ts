/**
 * Idempotent post-migration: point the bootstrap user at OWNER_EMAIL
 * so Google sign-in links to the account that owns existing data.
 * That account is a normal USER — ops admin is ADMIN_ID / ADMIN_PASSWORD only.
 *
 * Usage: npx tsx scripts/migrate-to-multiuser.ts
 */
import { PrismaClient } from "@prisma/client";

const BOOTSTRAP_ID = "bootstrap_admin";
const PLACEHOLDER_EMAIL = "__bootstrap__@mynetwork.local";

function ownerEmail() {
  return (
    process.env.OWNER_EMAIL?.trim().toLowerCase() ||
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
    ""
  );
}

async function main() {
  const email = ownerEmail();
  if (!email) {
    console.warn(
      "[migrate-to-multiuser] OWNER_EMAIL is not set — skipping email update. " +
        "Set OWNER_EMAIL and re-run before signing in.",
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const bootstrap = await prisma.user.findUnique({ where: { id: BOOTSTRAP_ID } });
    if (!bootstrap) {
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        if (byEmail.role !== "USER") {
          await prisma.user.update({
            where: { id: byEmail.id },
            data: { role: "USER" },
          });
          console.log(`[migrate-to-multiuser] Ensured USER role for owner ${email}`);
        } else {
          console.log(`[migrate-to-multiuser] Owner ${email} already present`);
        }
      } else {
        console.warn(
          `[migrate-to-multiuser] No bootstrap user and no user for ${email}. ` +
            "Sign in once with that Google account after an invite, or re-run after migrate.",
        );
      }
      return;
    }

    const conflict = await prisma.user.findFirst({
      where: { email, NOT: { id: BOOTSTRAP_ID } },
    });
    if (conflict) {
      console.log(
        `[migrate-to-multiuser] Found existing user for ${email}; merging bootstrap data onto it`,
      );
      await prisma.$transaction([
        prisma.person.updateMany({
          where: { userId: BOOTSTRAP_ID },
          data: { userId: conflict.id },
        }),
        prisma.interaction.updateMany({
          where: { userId: BOOTSTRAP_ID },
          data: { userId: conflict.id },
        }),
        prisma.chatMessage.updateMany({
          where: { userId: BOOTSTRAP_ID },
          data: { userId: conflict.id },
        }),
        prisma.nudge.updateMany({
          where: { userId: BOOTSTRAP_ID },
          data: { userId: conflict.id },
        }),
        prisma.llmUsage.updateMany({
          where: { userId: BOOTSTRAP_ID },
          data: { userId: conflict.id },
        }),
        prisma.user.update({
          where: { id: conflict.id },
          data: { role: "USER" },
        }),
        prisma.user.delete({ where: { id: BOOTSTRAP_ID } }),
      ]);
      console.log(`[migrate-to-multiuser] Merged bootstrap data into ${email}`);
      return;
    }

    await prisma.user.update({
      where: { id: BOOTSTRAP_ID },
      data: {
        email,
        role: "USER",
        name: bootstrap.name && bootstrap.name !== "Admin" ? bootstrap.name : "Owner",
      },
    });
    console.log(
      `[migrate-to-multiuser] Bootstrap owner email set to ${email}` +
        (bootstrap.email === PLACEHOLDER_EMAIL ? " (was placeholder)" : ""),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
