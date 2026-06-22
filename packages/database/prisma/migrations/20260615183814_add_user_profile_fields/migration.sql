-- AlterTable
ALTER TABLE "User" ADD COLUMN     "realName" TEXT,
ADD COLUMN     "relationshipComment" TEXT,
ADD COLUMN     "showEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showRealName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showRelationshipComment" BOOLEAN NOT NULL DEFAULT false;
