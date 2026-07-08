-- CreateEnum
CREATE TYPE "ContactTag" AS ENUM ('FAMILY', 'FRIEND', 'ACQUAINTANCE', 'BUSINESS');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "tag" "ContactTag",
    "closeness" INTEGER,
    "whatTheyDo" TEXT,
    "howWeMet" TEXT,
    "location" TEXT,
    "birthday" TEXT,
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "likes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dislikes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relationshipSummary" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "lastInteractedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawText" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "personIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nudge" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "personId" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PersonKnows" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PersonKnows_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_InteractionToPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InteractionToPerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PersonKnows_B_index" ON "_PersonKnows"("B");

-- CreateIndex
CREATE INDEX "_InteractionToPerson_B_index" ON "_InteractionToPerson"("B");

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonKnows" ADD CONSTRAINT "_PersonKnows_A_fkey" FOREIGN KEY ("A") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonKnows" ADD CONSTRAINT "_PersonKnows_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InteractionToPerson" ADD CONSTRAINT "_InteractionToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InteractionToPerson" ADD CONSTRAINT "_InteractionToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
