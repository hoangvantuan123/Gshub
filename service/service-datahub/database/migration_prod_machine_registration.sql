-- Registration and query menu for saved Tab 7 machine comparison rows.
BEGIN;

ALTER TABLE public."_ERPMachineComparisonDetail"
    ADD COLUMN IF NOT EXISTS "TKSXRegCode" TEXT;
CREATE INDEX IF NOT EXISTS "idx_machine_comp_tksxregcode"
    ON public."_ERPMachineComparisonDetail" ("TKSXRegCode");

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
    WHERE "Key" = 'report_prod_machine_registration';
    IF menu_id IS NULL THEN
        SELECT COALESCE(MAX("Id"), 0) + 1 INTO menu_id FROM public."_ERPMenus";
        INSERT INTO public."_ERPMenus" (
            "Id", "Key", "MenuRootId", "MenuSubRootId", "Label", "Link", "Type",
            "Icon", "OrderSeq", "IdxNo", "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
        ) VALUES (
            menu_id, 'report_prod_machine_registration', root_id, parent_id,
            'Đăng ký báo cáo máy', '/erp/u/report/prod-machine', 'menu',
            'Factory', 7, 7, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 1
        );
    ELSE
        UPDATE public."_ERPMenus" SET
            "MenuRootId" = root_id, "MenuSubRootId" = parent_id,
            "Label" = 'Đăng ký báo cáo máy',
            "Link" = '/erp/u/report/prod-machine',
            "Type" = 'menu', "View" = TRUE, "Create" = TRUE, "Edit" = TRUE,
            "Delete" = TRUE, "Import" = FALSE, "Export" = FALSE,
            "OrderSeq" = 7, "IdxNo" = 7
        WHERE "Id" = menu_id;
    END IF;

    INSERT INTO public."_ERPMenuActions" ("MenuId", "ActionKey", "ActionName", "IdxNo", "Active")
    SELECT menu_id, action.code, action.label, action.idx, TRUE
    FROM (VALUES
        ('BTN_SEARCH', 'Truy vấn đăng ký báo cáo máy', 1),
        ('BTN_CREATE', 'Nạp phiếu thống kê để đăng ký máy', 2),
        ('BTN_SAVE', 'Lưu đăng ký báo cáo máy', 3),
        ('BTN_DELETE', 'Xóa dòng đăng ký báo cáo máy', 4)
    ) AS action(code, label, idx)
    WHERE NOT EXISTS (
        SELECT 1 FROM public."_ERPMenuActions" existing
        WHERE existing."MenuId" = menu_id AND existing."ActionKey" = action.code
    );

    FOR grp IN SELECT "Id" FROM public."_ERPGroups" LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public."_ERPRolesUsers"
            WHERE "GroupId" = grp."Id" AND "MenuId" = menu_id AND "Type" = 'menu'
        ) THEN
            INSERT INTO public."_ERPRolesUsers" (
                "GroupId", "MenuId", "RootMenuId", "Type", "Name", "View", "Create", "Edit", "Delete", "Import", "Export", "RowVersion"
            ) VALUES (
                grp."Id", menu_id, root_id, 'menu', 'Đăng ký báo cáo máy', TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, 1
            );
        ELSE
            UPDATE public."_ERPRolesUsers"
            SET "RootMenuId" = root_id, "Name" = 'Đăng ký báo cáo máy',
                "View" = TRUE, "Create" = TRUE, "Edit" = TRUE, "Delete" = TRUE,
                "Import" = FALSE, "Export" = FALSE
            WHERE "GroupId" = grp."Id" AND "MenuId" = menu_id AND "Type" = 'menu';
        END IF;
    END LOOP;

    menu_sequence := pg_get_serial_sequence('public."_ERPMenus"', 'Id');
    IF menu_sequence IS NOT NULL THEN
        PERFORM setval(menu_sequence::regclass, (SELECT MAX("Id") FROM public."_ERPMenus"), TRUE);
    END IF;
END $$;

COMMIT;
