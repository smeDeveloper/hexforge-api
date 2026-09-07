/*
  Warnings:

  - A unique constraint covering the columns `[code,user]` on the table `verification_codes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "verification_codes_code_key";

-- AlterTable
ALTER TABLE "verification_codes" ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "verification_codes_code_user_key" ON "verification_codes"("code", "user");
