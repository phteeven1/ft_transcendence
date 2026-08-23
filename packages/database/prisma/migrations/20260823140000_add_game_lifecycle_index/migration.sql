-- CreateIndex
CREATE INDEX "Game_isActive_isFinished_initiatedTime_idx" ON "Game"("isActive", "isFinished", "initiatedTime");
