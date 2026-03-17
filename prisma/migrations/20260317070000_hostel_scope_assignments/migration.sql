-- CreateEnum
CREATE TYPE "GroupScopeType" AS ENUM ('HOSTEL', 'WING');

-- AlterTable
ALTER TABLE "Group"
ADD COLUMN "hostel" TEXT,
ADD COLUMN "scopeType" "GroupScopeType" NOT NULL DEFAULT 'HOSTEL';

UPDATE "Group"
SET "hostel" = "value"
WHERE "hostel" IS NULL;

ALTER TABLE "Group"
ALTER COLUMN "hostel" SET NOT NULL;

-- DropIndex
DROP INDEX "Group_family_value_key";

-- AlterTable
ALTER TABLE "Student"
ADD COLUMN "wing" TEXT NOT NULL DEFAULT '';

UPDATE "Student"
SET "wing" = CASE
  WHEN regexp_replace(trim("roomNo"), '\s+', '', 'g') = '' THEN 'General'
  WHEN regexp_replace(trim("roomNo"), '\s+', '', 'g') ~ '^[A-Za-z]+' THEN UPPER(substring(regexp_replace(trim("roomNo"), '\s+', '', 'g') from '^[A-Za-z]+'))
  WHEN regexp_replace(trim("roomNo"), '\s+', '', 'g') ~ '[A-Za-z]+$' THEN UPPER(substring(regexp_replace(trim("roomNo"), '\s+', '', 'g') from '[A-Za-z]+$'))
  WHEN regexp_replace(trim("roomNo"), '\s+', '', 'g') ~ '[0-9]' THEN substring(regexp_replace(trim("roomNo"), '\s+', '', 'g') from '([0-9])')
  ELSE 'General'
END;

-- CreateIndex
CREATE INDEX "Group_family_scopeType_hostel_idx" ON "Group"("family", "scopeType", "hostel");

-- CreateIndex
CREATE UNIQUE INDEX "Group_family_scopeType_hostel_value_key" ON "Group"("family", "scopeType", "hostel", "value");

-- CreateIndex
CREATE INDEX "Student_hostel_wing_idx" ON "Student"("hostel", "wing");
