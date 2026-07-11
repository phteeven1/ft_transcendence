-- AlterTable
ALTER TABLE "GamePlayer" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Crossword" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "solution" JSONB NOT NULL,
    "playerGrid" JSONB NOT NULL,
    "creditGrid" JSONB,
    "clues" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Crossword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Crossword_gameId_key" ON "Crossword"("gameId");

-- AddForeignKey
ALTER TABLE "Crossword" ADD CONSTRAINT "Crossword_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
