-- Run on GsHub. Rerunnable; no PK/FK/UNIQUE/CHECK on the new catalog.
BEGIN;

CREATE TABLE IF NOT EXISTS public."_ERPProdStatsRemarkType" (
    "IdSeq" VARCHAR(36),
    "TypeCode" VARCHAR(100),
    "TypeName" VARCHAR(255),
    "Description" TEXT,
    "IsActive" BOOLEAN DEFAULT TRUE,
    "IdxNo" INTEGER,
    "CreatedBy" VARCHAR(36),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(36),
    "UpdatedAt"   TIMESTAMPTZ DEFAULT NOW(),
    "RowVersion"  BIGINT NOT NULL DEFAULT 1
);

ALTER TABLE public."_ERPProdStatsRemarkType"
    ADD COLUMN IF NOT EXISTS "RowVersion" BIGINT NOT NULL DEFAULT 1;

ALTER TABLE public."_ERPProdStatsDetail"
    ADD COLUMN IF NOT EXISTS "RemarkTypeSeq" VARCHAR(36),
    ADD COLUMN IF NOT EXISTS "RemarkContent" TEXT;

-- Register the menu under the existing report-registration submenu.
-- Existing grants are preserved; permissions are assigned in the permissions UI.
LOCK TABLE public."_ERPMenus" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public."_ERPMenuActions" IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE
    parent_id BIGINT;
    root_id BIGINT;
    menu_id BIGINT;
    menu_sequence TEXT;
BEGIN
    SELECT "Id", "MenuRootId" INTO STRICT parent_id, root_id
    FROM public."_ERPMenus" WHERE "Key" = 'report_registration_group';

    SELECT "Id" INTO menu_id FROM public."_ERPMenus"
    WHERE "Key" = 'report_prod_stats_remark_type';
    IF menu_id IS NULL THEN
        SELECT COALESCE(MAX("Id"), 0) + 1 INTO menu_id FROM public."_ERPMenus";
        INSERT INTO public."_ERPMenus" (
            "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type",
            "Icon", "OrderSeq", "IdxNo", "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
        ) VALUES (
            menu_id, 'report_prod_stats_remark_type', root_id, parent_id,
            'Đăng ký phân loại diễn giải TKSX', '/erp/u/report/prod-stats-remark-type', 'menu',
            'Tags', 5, 5, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 1
        );
    ELSE
        UPDATE public."_ERPMenus" SET
            "MenuRootId" = root_id, "MenuSubRootId" = parent_id,
            "Label" = 'Đăng ký phân loại diễn giải TKSX',
            "Link" = '/erp/u/report/prod-stats-remark-type',
            "Type" = 'menu', "View" = TRUE, "Create" = TRUE, "Edit" = TRUE,
            "Delete" = TRUE, "Import" = FALSE, "Export" = FALSE
        WHERE "Id" = menu_id;
    END IF;

    INSERT INTO public."_ERPMenuActions" ("MenuId", "ActionKey", "ActionName", "IdxNo", "Active")
    SELECT menu_id, a.code, a.label, a.idx, TRUE
    FROM (VALUES
        ('BTN_SEARCH', 'Truy vấn phân loại', 1),
        ('BTN_CREATE', 'Thêm phân loại', 2),
        ('BTN_EDIT', 'Sửa phân loại', 3),
        ('BTN_DELETE', 'Xóa phân loại', 4),
        ('BTN_SAVE', 'Lưu phân loại', 5)
    ) AS a(code, label, idx)
    WHERE NOT EXISTS (
        SELECT 1 FROM public."_ERPMenuActions" existing
        WHERE existing."MenuId" = menu_id AND existing."ActionKey" = a.code
    );

    menu_sequence := pg_get_serial_sequence('public."_ERPMenus"', 'Id');
    IF menu_sequence IS NOT NULL THEN
        PERFORM setval(menu_sequence::regclass, (SELECT MAX("Id") FROM public."_ERPMenus"), TRUE);
    END IF;
END $$;

COMMIT;
