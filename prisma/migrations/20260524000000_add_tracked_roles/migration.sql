CREATE TABLE "tracked_roles" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID         NOT NULL,
    "title"      TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracked_roles_user_id_title_key" ON "tracked_roles"("user_id", "title");

ALTER TABLE "tracked_roles"
  ADD CONSTRAINT "tracked_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
