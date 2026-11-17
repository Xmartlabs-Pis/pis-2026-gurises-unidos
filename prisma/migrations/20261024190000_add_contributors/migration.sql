ALTER TYPE "AuditEntity" ADD VALUE 'contributor';

CREATE TABLE "Contributor" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    CONSTRAINT "Contributor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contributor_name_key" ON "Contributor"("name");
CREATE UNIQUE INDEX "Contributor_name_case_insensitive_key" ON "Contributor"(lower("name"));

INSERT INTO "Contributor" ("name") VALUES
    ('INAU'),
    ('INEFOP'),
    ('ANEP'),
    ('Ministerio del Interior'),
    ('Fundación Telefónica'),
    ('Fundación UPM'),
    ('Reaching U'),
    ('PepsiCo'),
    ('BASF'),
    ('OSF'),
    ('UNFPA');
