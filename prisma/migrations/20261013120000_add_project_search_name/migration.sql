-- unaccent() is only STABLE, so a generated column needs an IMMUTABLE wrapper bound to an explicit dictionary.
CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
RETURN public.unaccent('public.unaccent'::regdictionary, $1);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "searchName" TEXT GENERATED ALWAYS AS (lower(public.immutable_unaccent("name"))) STORED;
