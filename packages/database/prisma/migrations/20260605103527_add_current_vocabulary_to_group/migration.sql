/*
  Warnings:

  - You are about to drop the column `isCurrent` on the `Vocabulary` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[currentVocabularyId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "currentVocabularyId" INTEGER;

-- AlterTable
ALTER TABLE "Vocabulary" DROP COLUMN "isCurrent";

-- CreateIndex
CREATE UNIQUE INDEX "Group_currentVocabularyId_key" ON "Group"("currentVocabularyId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_currentVocabularyId_fkey" FOREIGN KEY ("currentVocabularyId") REFERENCES "Vocabulary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
