-- CreateEnum
CREATE TYPE "ChatEntryType" AS ENUM ('LOG', 'ADM', 'GEN', 'MEM');

-- CreateEnum
CREATE TYPE "ChatEventKey" AS ENUM ('CREATE_GROUP', 'JOIN_GROUP', 'LEAVE_GROUP', 'PROMOTE_ADMIN', 'RESIGN_ADMIN', 'RENAME_GROUP', 'EXPEL_MEMBER', 'DELETE_GROUP', 'UPLOAD_VOCABULARY', 'RENAME_VOCABULARY', 'DELETE_VOCABULARY', 'SET_ACTIVE_VOCABULARY', 'SEND_INVITE');

-- CreateTable
CREATE TABLE "GroupChatEntry" (
    "groupId" INTEGER NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ChatEntryType" NOT NULL,
    "authorId" INTEGER NOT NULL,
    "targetId" INTEGER,
    "eventKey" "ChatEventKey",
    "content" TEXT,

    CONSTRAINT "GroupChatEntry_pkey" PRIMARY KEY ("groupId","entryNumber")
);

-- CreateIndex
CREATE INDEX "GroupChatEntry_groupId_idx" ON "GroupChatEntry"("groupId");

-- AddForeignKey
ALTER TABLE "GroupChatEntry" ADD CONSTRAINT "GroupChatEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChatEntry" ADD CONSTRAINT "GroupChatEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
