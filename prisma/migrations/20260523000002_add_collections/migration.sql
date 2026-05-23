-- CreateTable
CREATE TABLE "collections" (
    "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"            TEXT         NOT NULL,
    "slug"            TEXT         NOT NULL,
    "description"     TEXT,
    "cover_image_url" TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateTable
CREATE TABLE "collection_companies" (
    "collection_id" UUID    NOT NULL,
    "company_id"    UUID    NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_companies_pkey" PRIMARY KEY ("collection_id", "company_id")
);

-- AddForeignKey
ALTER TABLE "collection_companies" ADD CONSTRAINT "collection_companies_collection_id_fkey"
    FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_companies" ADD CONSTRAINT "collection_companies_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
