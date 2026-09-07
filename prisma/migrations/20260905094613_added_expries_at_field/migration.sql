/*
  Warnings:

  - Added the required column `expiresAt` to the `verification_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "verification_codes" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL;
