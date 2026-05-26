-- CreateEnum
CREATE TYPE "company_size" AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');

-- CreateEnum
CREATE TYPE "funding_stage" AS ENUM ('pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'growth', 'public');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "size" "company_size";
ALTER TABLE "companies" ADD COLUMN "funding_stage" "funding_stage";
