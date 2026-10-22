-- Migration for Prod Machine Catalog
-- Run on GsHub. Rerunnable; no PK/FK/UNIQUE/CHECK on the catalog table.
BEGIN;

CREATE TABLE IF NOT EXISTS public."_ERPProdMachineCatalog" (
    "IdSeq" VARCHAR(36),
    "MachineCode" VARCHAR(100),
    "MachineName" VARCHAR(255),
    "TeamCode" VARCHAR(100),
    "TeamName" VARCHAR(255),
    "Factory" VARCHAR(100),
    "Description" TEXT,
    "IsActive" BOOLEAN DEFAULT TRUE,
    "IdxNo" INTEGER,
    "CreatedBy" VARCHAR(100),
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy" VARCHAR(100),
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "RowVersion" BIGINT NOT NULL DEFAULT 1
);

ALTER TABLE public."_ERPProdMachineCatalog"
    ADD COLUMN IF NOT EXISTS "RowVersion" BIGINT NOT NULL DEFAULT 1;

ALTER TABLE public."_ERPProdMachineCatalog"
    ALTER COLUMN "CreatedBy" TYPE VARCHAR(100),
    ALTER COLUMN "UpdatedBy" TYPE VARCHAR(100);

-- Seed initial data if not already present
INSERT INTO public."_ERPProdMachineCatalog" (
    "IdSeq", "MachineCode", "MachineName", "TeamCode", "TeamName", "Factory", "Description", "IsActive", "IdxNo", "CreatedBy", "RowVersion"
)
SELECT 
    gen_random_uuid()::text, m.code, m.name, m.team_code, m.team_name, m.factory, 'Khởi tạo danh mục máy ban đầu', TRUE, m.idx, 'SYSTEM', 1
FROM (VALUES
    ('QV-CTP-01', 'Máy CTP Kodak số 1', 'GS5.CNTB.01.03.02', 'Nhóm Out bản GS Quế võ', 'GS Quế võ', 1),
    ('QV-CTP-02', 'Máy CTP Kodak số 2', 'GS5.CNTB.01.03.02', 'Nhóm Out bản GS Quế võ', 'GS Quế võ', 2),
    ('QV-CTP-03', 'Máy CTP CRON số 1', 'GS5.CNTB.01.03.02', 'Nhóm Out bản GS Quế võ', 'GS Quế võ', 3),
    ('QV-HIEN-01', 'Máy Hiện bản Heidelberg số 1', 'GS5.CNTB.01.03.02', 'Nhóm Out bản GS Quế võ', 'GS Quế võ', 4)
) AS m(code, name, team_code, team_name, factory, idx)
WHERE NOT EXISTS (
    SELECT 1 FROM public."_ERPProdMachineCatalog" existing
    WHERE existing."MachineCode" = m.code
);

-- Register menu under report_registration_group
LOCK TABLE public."_ERPMenus" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public."_ERPMenuActions" IN SHARE ROW EXCLUSIVE MODE;
DO $$
DECLARE
    parent_id BIGINT;
    root_id BIGINT;
    menu_id BIGINT;
    menu_sequence TEXT;
    grp RECORD;
BEGIN
    SELECT "Id", "MenuRootId" INTO parent_id, root_id
    FROM public."_ERPMenus" WHERE "Key" = 'report_registration_group';

    IF parent_id IS NULL THEN
        parent_id := 400;
        root_id := 1;
    END IF;

    SELECT "Id" INTO menu_id FROM public."_ERPMenus"
    WHERE "Key" = 'report_prod_machine_catalog';

    IF menu_id IS NULL THEN
        SELECT COALESCE(MAX("Id"), 0) + 1 INTO menu_id FROM public."_ERPMenus";
        INSERT INTO public."_ERPMenus" (
            "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type",
            "Icon", "OrderSeq", "IdxNo", "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
        ) VALUES (
            menu_id, 'report_prod_machine_catalog', root_id, parent_id,
            'Đăng ký danh mục máy móc', '/erp/u/report/prod-machine-catalog', 'menu',
            'Cpu', 6, 6, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 1
        );
    ELSE
        UPDATE public."_ERPMenus" SET
            "MenuRootId" = root_id, "MenuSubRootId" = parent_id,
            "Label" = 'Đăng ký danh mục máy móc',
            "Link" = '/erp/u/report/prod-machine-catalog',
            "Type" = 'menu', "View" = TRUE, "Create" = TRUE, "Edit" = TRUE,
            "Delete" = TRUE, "Import" = FALSE, "Export" = FALSE
        WHERE "Id" = menu_id;
    END IF;

    INSERT INTO public."_ERPMenuActions" ("MenuId", "ActionKey", "ActionName", "IdxNo", "Active")
    SELECT menu_id, a.code, a.label, a.idx, TRUE
    FROM (VALUES
        ('BTN_SEARCH', 'Truy vấn danh mục máy móc', 1),
        ('BTN_CREATE', 'Thêm máy móc', 2),
        ('BTN_EDIT', 'Sửa máy móc', 3),
        ('BTN_DELETE', 'Xóa máy móc', 4),
        ('BTN_SAVE', 'Lưu máy móc', 5)
    ) AS a(code, label, idx)
    WHERE NOT EXISTS (
        SELECT 1 FROM public."_ERPMenuActions" existing
        WHERE existing."MenuId" = menu_id AND existing."ActionKey" = a.code
    );

    -- Grant default permissions to role groups (e.g. Group 1, 2)
    FOR grp IN SELECT "Id" FROM public."_ERPGroups" LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public."_ERPRolesUsers"
            WHERE "GroupId" = grp."Id" AND "MenuId" = menu_id AND "Type" = 'menu'
        ) THEN
            INSERT INTO public."_ERPRolesUsers" (
                "GroupId", "MenuId", "RootMenuId", "Type", "Name", "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
            ) VALUES (
                grp."Id", menu_id, root_id, 'menu', 'Đăng ký danh mục máy móc', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 1
            );
        ELSE
            UPDATE public."_ERPRolesUsers"
            SET "View" = TRUE, "Create" = TRUE, "Edit" = TRUE, "Delete" = TRUE
            WHERE "GroupId" = grp."Id" AND "MenuId" = menu_id AND "Type" = 'menu';
        END IF;
    END LOOP;

    menu_sequence := pg_get_serial_sequence('public."_ERPMenus"', 'Id');
    IF menu_sequence IS NOT NULL THEN
        PERFORM setval(menu_sequence::regclass, (SELECT MAX("Id") FROM public."_ERPMenus"), TRUE);
    END IF;
END $$;

COMMIT;
