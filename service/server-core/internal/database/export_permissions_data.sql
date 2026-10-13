-- Run on the SOURCE PostgreSQL database. Only temporary objects are written.
-- The result column sql_script contains SQL to run on the TARGET database.
-- Target tables/columns must already match the source. IDs must mean the same
-- thing in both databases; this is a copy, not an ID-remapping merge.
-- Set include_users=true below only when copying the same account identities.

BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL standard_conforming_strings = on;

CREATE TEMP TABLE permission_export_options (schema_name text, include_users boolean) ON COMMIT DROP;
INSERT INTO permission_export_options VALUES ('public', false);

CREATE TEMP TABLE permission_export_tables (
    ordinal integer PRIMARY KEY, table_name text, required boolean
) ON COMMIT DROP;
INSERT INTO permission_export_tables VALUES
    (1, '_ERPUsers', false),
    (10, '_ERPRootMenus', true),
    (20, '_ERPMenus', true),
    (30, '_ERPGroups', true),
    (40, '_ERPPermActions', true),
    (50, '_ERPActions', true),
    (60, '_ERPMenuActions', true),
    (70, '_ERPRolesUsers', true),
    (80, '_ERPTblGrp', true),
    (90, '_ERPTblGrpItem', true),
    (100, '_ERPTblGrpPerm', true),
    (110, '_ERPTblGrpPermRole', true),
    -- Additional permission configuration, when present in the source.
    (120, '_ERPSysAttrGroups', false),
    (130, '_ERPSysAttrItems', false),
    (140, '_ERPPermFields', false),
    (150, '_ERPPermResourceFields', false),
    (160, '_ERPPermResourceScopes', false),
    (170, '_ERPGroupActionPerms', false),
    (180, '_ERPGroupActionPermsItems', false);

CREATE TEMP TABLE permission_export_output (
    ordinal integer, part integer, sql_text text
) ON COMMIT DROP;
INSERT INTO permission_export_output VALUES
    (0, 0, E'BEGIN;\nSET LOCAL standard_conforming_strings = on;\nSET CONSTRAINTS ALL DEFERRED;');

DO $export$
DECLARE
    opts record;
    entry record;
    attr record;
    relation_id regclass;
    qualified_name text;
    column_list text;
    key_list text;
    update_list text;
    conflict_clause text;
    data_json jsonb;
    sequence_name text;
BEGIN
    SELECT * INTO opts FROM permission_export_options;
    FOR entry IN SELECT * FROM permission_export_tables ORDER BY ordinal LOOP
        IF entry.table_name = '_ERPUsers' AND NOT opts.include_users THEN
            CONTINUE;
        END IF;
        qualified_name := format('%I.%I', opts.schema_name, entry.table_name);
        relation_id := to_regclass(qualified_name);
        IF relation_id IS NULL THEN
            IF entry.required OR entry.table_name = '_ERPUsers' THEN
                RAISE EXCEPTION 'Required source table % is missing', qualified_name;
            END IF;
            RAISE NOTICE 'Skipping absent optional table %', qualified_name;
            CONTINUE;
        END IF;

        SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
        INTO column_list
        FROM pg_attribute a
        WHERE a.attrelid = relation_id AND a.attnum > 0
          AND NOT a.attisdropped AND a.attgenerated = '';

        SELECT string_agg(format('%I', a.attname), ', ' ORDER BY k.ordinality)
        INTO key_list
        FROM pg_index i
        CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE i.indrelid = relation_id AND i.indisprimary;
        IF key_list IS NULL THEN
            RAISE EXCEPTION 'Table % needs a primary key for upsert', qualified_name;
        END IF;

        SELECT string_agg(format('%1$I = EXCLUDED.%1$I', a.attname), ', ' ORDER BY a.attnum)
        INTO update_list
        FROM pg_attribute a
        WHERE a.attrelid = relation_id AND a.attnum > 0
          AND NOT a.attisdropped AND a.attgenerated = ''
          AND NOT EXISTS (
              SELECT 1 FROM pg_index i
              WHERE i.indrelid = relation_id AND i.indisprimary AND a.attnum = ANY(i.indkey)
          );
        conflict_clause := CASE WHEN update_list IS NULL THEN 'DO NOTHING'
            ELSE 'DO UPDATE SET ' || update_list END;

        EXECUTE format('SELECT jsonb_agg(to_jsonb(t)) FROM %s t', qualified_name) INTO data_json;
        IF data_json IS NOT NULL THEN
            INSERT INTO permission_export_output VALUES (
                entry.ordinal, 0,
                format(E'-- %s\nINSERT INTO %s (%s) OVERRIDING SYSTEM VALUE\nSELECT %s FROM jsonb_populate_recordset(NULL::%s, %L::jsonb) AS src\nWHERE true ON CONFLICT (%s) %s;',
                    entry.table_name, qualified_name, column_list, column_list,
                    qualified_name, data_json::text, key_list, conflict_clause)
            );
        END IF;

        -- Refresh serial/identity sequences using the maximum in the target.
        FOR attr IN SELECT attname FROM pg_attribute
            WHERE attrelid = relation_id AND attnum > 0 AND NOT attisdropped
        LOOP
            sequence_name := pg_get_serial_sequence(qualified_name, attr.attname);
            IF sequence_name IS NOT NULL THEN
                INSERT INTO permission_export_output VALUES (
                    entry.ordinal, 1,
                    format('SELECT setval(pg_get_serial_sequence(%L, %L), GREATEST(COALESCE((SELECT MAX(%I) FROM %s), 0) + 1, (SELECT last_value FROM %s)), false);',
                        qualified_name, attr.attname, attr.attname, qualified_name, sequence_name)
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$export$;

INSERT INTO permission_export_output VALUES (999, 0, 'COMMIT;');
SELECT string_agg(sql_text, E'\n\n' ORDER BY ordinal, part) AS sql_script
FROM permission_export_output;
COMMIT;
