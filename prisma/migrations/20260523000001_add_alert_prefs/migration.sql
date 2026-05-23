-- CreateEnum
CREATE TYPE "alert_mode" AS ENUM ('instant', 'daily');

-- AlterTable: add alert prefs and a per-user unsubscribe token to users
ALTER TABLE "users"
  ADD COLUMN "alert_mode"        "alert_mode" NOT NULL DEFAULT 'instant',
  ADD COLUMN "alerts_paused"     BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "unsubscribe_token" UUID         NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "users_unsubscribe_token_key" ON "users"("unsubscribe_token");
