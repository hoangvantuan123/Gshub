-- Run separately from a transaction on the production database after review.
-- CONCURRENTLY avoids holding a table-wide write lock during index creation.
CREATE INDEX CONCURRENTLY IF NOT EXISTS erp_roles_user_membership_idx
ON "_ERPRolesUsers" ("UserSeq", "GroupId") WHERE "Type" = 'user';

CREATE INDEX CONCURRENTLY IF NOT EXISTS erp_roles_group_menu_idx
ON "_ERPRolesUsers" ("GroupId", "MenuId", "Type");

CREATE INDEX CONCURRENTLY IF NOT EXISTS erp_menus_permission_key_idx
ON "_ERPMenus" (LOWER(TRIM("Key")));
