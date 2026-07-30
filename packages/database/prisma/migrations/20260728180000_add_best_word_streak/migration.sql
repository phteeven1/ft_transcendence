-- AlterTable
ALTER TABLE "Player" ADD COLUMN "bestWordStreak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GamePlayer" ADD COLUMN "bestWordStreak" INTEGER NOT NULL DEFAULT 0;
