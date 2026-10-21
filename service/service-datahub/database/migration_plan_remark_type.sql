-- Run on GsHub. Rerunnable.
-- Dùng chung bảng danh mục public."_ERPProdStatsRemarkType" cho cả TKSX và KHSX.
BEGIN;

ALTER TABLE public."_ERPPlanDetail"
    ADD COLUMN IF NOT EXISTS "RemarkTypeSeq" VARCHAR(36),
    ADD COLUMN IF NOT EXISTS "RemarkContent" TEXT;

COMMIT;
