-- Run on source or target. This does not change data.
SELECT 'roots' AS kind, COUNT(*) AS rows FROM public."_ERPRootMenus"
UNION ALL SELECT 'menus', COUNT(*) FROM public."_ERPMenus"
UNION ALL SELECT 'groups', COUNT(*) FROM public."_ERPGroups"
UNION ALL SELECT 'grants_and_memberships', COUNT(*) FROM public."_ERPRolesUsers"
UNION ALL SELECT 'action_catalogue', COUNT(*) FROM public."_ERPActions"
UNION ALL SELECT 'menu_actions', COUNT(*) FROM public."_ERPMenuActions";

SELECT "Type", COUNT(*) AS rows FROM public."_ERPRolesUsers"
GROUP BY "Type" ORDER BY "Type";

-- Memberships whose UserSeq does not identify a target account.
SELECT r."Id", r."UserSeq", r."UserId", r."GroupId"
FROM public."_ERPRolesUsers" r
LEFT JOIN public."_ERPUsers" u ON u."UserSeq"::text = r."UserSeq"::text
WHERE r."Type" = 'user' AND u."UserSeq" IS NULL;

-- Grants with a missing group/menu/root. Zero rows is the expected result.
SELECT r."Id", r."Type", r."GroupId", r."MenuId", r."RootMenuId", r."Name"
FROM public."_ERPRolesUsers" r
LEFT JOIN public."_ERPGroups" g ON g."Id" = r."GroupId"
LEFT JOIN public."_ERPMenus" m ON m."Id" = r."MenuId"
LEFT JOIN public."_ERPRootMenus" rm ON rm."Id" = r."RootMenuId"
WHERE (r."GroupId" IS NOT NULL AND g."Id" IS NULL)
   OR (r."Type" IN ('menu', 'submenu', 'menuitem', 'action') AND m."Id" IS NULL)
   OR (r."Type" IN ('rootmenu', 'root') AND rm."Id" IS NULL);
