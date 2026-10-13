-- Existing tables are not upgraded by CREATE TABLE IF NOT EXISTS.
-- Preserve account identifiers and grants; adding a nullable column does not
-- assign permissions. Existing memberships must retain their verified UserSeq.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "_ERPRolesUsers" ADD COLUMN IF NOT EXISTS "UserSeq" VARCHAR(36);
ALTER TABLE "_ERPTblGrpPermRole" ADD COLUMN IF NOT EXISTS "UserSeq" VARCHAR(36);
COMMIT;
