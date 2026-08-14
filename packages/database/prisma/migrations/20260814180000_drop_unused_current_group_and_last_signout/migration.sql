-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_currentGroupId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "currentGroupId";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "lastSignout";
