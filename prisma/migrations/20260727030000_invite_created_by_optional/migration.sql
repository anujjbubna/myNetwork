-- AlterTable
ALTER TABLE "Invite" ALTER COLUMN "createdById" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_createdById_fkey";

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
