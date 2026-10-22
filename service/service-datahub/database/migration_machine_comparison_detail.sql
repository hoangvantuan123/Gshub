-- Migration for Machine Comparison Detail (_ERPMachineComparisonDetail)
-- Tab 7: Đối chiếu máy TKSX và KHSX
BEGIN;

CREATE TABLE IF NOT EXISTS public."_ERPMachineComparisonDetail" (
    "IdSeq"                   VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "MasterSeq"               VARCHAR(36) NOT NULL,    -- UUIDv7 của master báo cáo nguồn
    "RegCode"                 TEXT NOT NULL,
    "TKSXRegCode"             TEXT,
    "RowSeq"                  INTEGER DEFAULT 0,
    "WorkingTag"              VARCHAR(10) DEFAULT 'A',
    "SourceRow"               INTEGER DEFAULT 0,
    "StatSlipNo"              TEXT,
    "StatDate"                TEXT,
    "OperationOrderNo"        TEXT,
    "StageOrderNo"            TEXT,
    "OperationName"           TEXT,
    "MaterialCode"            TEXT,
    "MaterialName"            TEXT,
    "ActualMachineCode"       TEXT,
    "ActualMachineName"       TEXT,
    "MesSlipNo"               TEXT,
    "MesMachineCode"          TEXT,
    "MesMachineName"          TEXT,
    "MesComparisonStatus"     TEXT,
    "MesComparisonBasis"      TEXT,
    "PlannedMachineCode"      TEXT,
    "PlannedMachineName"      TEXT,
    "IsBelongToFactory"       TEXT,
    "MachineComparisonStatus" TEXT,
    "MachineDifference"       TEXT,
    "KhsxStatus"              TEXT,
    "ProducedQty"             TEXT,
    "QualifiedQty"            TEXT,
    "UserMemo"                TEXT,
    "RemarkTypeSeq"           VARCHAR(36),
    "RemarkContent"           TEXT,
    "RowVersion"              BIGINT NOT NULL DEFAULT 1,
    "IsActive"                BOOLEAN DEFAULT TRUE,
    "CreatedBy"               TEXT,
    "CreatedByName"           TEXT,
    "CreatedAt"               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy"               TEXT,
    "UpdatedByName"           TEXT,
    "UpdatedAt"               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public."_ERPMachineComparisonDetail"
    ADD COLUMN IF NOT EXISTS "TKSXRegCode" TEXT;

CREATE INDEX IF NOT EXISTS "idx_machine_comp_masterseq" ON public."_ERPMachineComparisonDetail" ("MasterSeq");
CREATE INDEX IF NOT EXISTS "idx_machine_comp_regcode" ON public."_ERPMachineComparisonDetail" ("RegCode");
CREATE INDEX IF NOT EXISTS "idx_machine_comp_tksxregcode" ON public."_ERPMachineComparisonDetail" ("TKSXRegCode");
CREATE INDEX IF NOT EXISTS "idx_machine_comp_operationno" ON public."_ERPMachineComparisonDetail" ("OperationOrderNo");
CREATE INDEX IF NOT EXISTS "idx_machine_comp_statslipno" ON public."_ERPMachineComparisonDetail" ("StatSlipNo");
CREATE INDEX IF NOT EXISTS "idx_machine_comp_actualcode" ON public."_ERPMachineComparisonDetail" ("ActualMachineCode");
CREATE INDEX IF NOT EXISTS "idx_machine_comp_plannedcode" ON public."_ERPMachineComparisonDetail" ("PlannedMachineCode");

COMMIT;
