# 📊 TÀI LIỆU CƠ SỞ DỮ LIỆU & SCHEMA (`server-core`)

Tài liệu này tổng hợp toàn bộ cấu trúc 20 bảng cơ sở dữ liệu của dịch vụ `server-core` và hệ thống Audit Log (`ERPLOG`), kèm theo quy tắc đặt tên **PascalCase / UpperCamelCase** chuẩn hóa cho Bảng, Cột và Module để tra cứu và truy vấn nhất quán trên toàn bộ hệ thống ERP.

---

## 🏛️ 1. Quy Tắc Đặt Tên Chuẩn (PascalCase / UpperCamelCase Naming Conventions)

Dưới đây là chuẩn quy hoạch đặt tên cho tất cả các Microservices (Auth, Warehouse, Basic, Log...) giúp dễ nhớ, tránh xung đột và khớp 100% với Struct trong Go / TypeScript / C#:

### 1.1. Cấu Trúc Tên Bảng (Table Naming Pattern)

`_<ModulePrefix><EntityName>`

- **Tiền Tố (**`Prefix`**)**:
  - `_ERP`: Các bảng thuộc nghiệp vụ Auth, Phân quyền, Danh mục gốc, Ngôn ngữ.
  - `_Sys`: Các bảng thuộc hệ thống kỹ thuật chung (Audit Log, System Config).
  - `_WH`: Các bảng thuộc module Quản lý Kho (`Warehouse`: Stock, Inbound, Outbound).
  - `_PO` / `_SO`: Các bảng thuộc module Đơn hàng Mua/Bán (`Purchase Order` / `Sales Order`).
- **Tên Thực Thể (**`EntityName`**)**: Đặt theo dạng **PascalCase / UpperCamelCase** số nhiều hoặc số ít rõ ràng (ví dụ: `Users`, `UserDetails`, `LoginFullLogs`, `FullAuditLog`, `RolesUsers`).
- **Chuẩn Hóa Đặt Tên Bảng User**: Đổi từ `_ERPUser_WEB` thành `_ERPUsers` theo đúng quy tắc PascalCase không có hậu tố dư thừa.

#### Ví Dụ Mẫu Bảng Chuẩn:

- `_ERPUsers`: Bảng tài khoản người dùng chính.
- `_ERPUserDetails`: Bảng thông tin chi tiết nhân viên.
- `_ERPLoginFullLogs`: Bảng ghi nhật ký toàn bộ lịch sử đăng nhập.
- `_SysFullAuditLog`: Bảng kiểm toán thao tác gRPC toàn bộ hệ thống.
- `_ERPRolesUsers`: Bảng phân quyền người dùng, vai trò và menu.

---

### 1.2. Cấu Trúc Tên Cột & Bảo Mật Khóa Chính (UUIDv7)

Tất cả các cột bắt buộc dùng **PascalCase / UpperCamelCase**:

1. **Khóa Chính Bảo Mật (Primary Key Standards - UUIDv7)**:
- `UserSeq` **/** `IdSeq` **(**`VARCHAR(36)` **- UUIDv7)**: Toàn bộ khóa chính định danh người dùng (`_ERPUsers`) và các bảng log/giao dịch được chuyển sang định dạng **UUIDv7 (36 ký tự)** thay vì `INTEGER` / `BIGSERIAL` tự tăng.
- *Mục đích*: **Tăng độ bảo mật**, ngăn ngừa suy đoán ID người dùng (ID Enumeration Attack), hỗ trợ sinh ID bất đồng bộ không lo trùng lặp giữa các microservices.
1. **Cột Trạng Thái & Cờ Điều Kiện**:
- Tiền tố `Is` hoặc `Status`: `StatusAcc`, `Active`, `IsOtpVerified`, `IsEmailVerified`, `CheckPass1`, `ViewScreen`, `EditScreen`.
1. **Cột Audit Vết Dữ Liệu (**`Audit Trail Columns`**)**:
- `CreatedBy` (`VARCHAR(36)`): Người tạo (UUIDv7).
- `CreatedAt` (`TIMESTAMPTZ`): Thời gian tạo (Default: `NOW()`).
- `UpdatedBy` (`VARCHAR(36)`): Người cập nhật gần nhất (UUIDv7).
- `UpdatedAt` (`TIMESTAMPTZ`): Thời gian cập nhật gần nhất.

---

## 📑 2. Danh Sách 20 Bảng Dữ Liệu Hệ Thống

| STT | Tên Bảng Chuẩn (PascalCase) | Mô Tả Chức Năng | Database | Khóa Chính |
| --- | --- | --- | --- | --- |
| 1 | `_ERPUsers` | Tài khoản người dùng, mật khẩu hash, trạng thái | `ERP` | `UserSeq` (UUIDv7) |
| 2 | `_ERPLoginFullLogs` | Nhật ký đăng nhập chi tiết (Web/Soft/App) | `ERPLOG` / `ERP` | `IdSeq` (UUIDv7) |
| 3 | `_SysFullAuditLog` | Audit log kiểm toán thao tác gRPC toàn hệ thống | `ERPLOG` / `ERP` | `IdSeq` (UUIDv7) |
| 4 | `_ERPUserDetails` | Thông tin chi tiết nhân viên, phòng ban | `ERP` | `IdSeq` (BIGSERIAL) |
| 5 | `_ERPRolesUsers` | Phân quyền User / Role / Menu | `ERP` | `Id` (BIGSERIAL) |
| 6 | `_ERPGroups` | Nhóm người dùng | `ERP` | `Id` (BIGSERIAL) |
| 7 | `_ERPMenus` | Danh mục Menu con | `ERP` | `Id` (BIGSERIAL) |
| 8 | `_ERPRootMenus` | Danh mục Menu gốc | `ERP` | `Id` (BIGSERIAL) |
| 9 | `_ERPActionPerms` | Phân quyền chi tiết thao tác theo Action | `ERP` | `Id` (BIGSERIAL) |
| 10 | `_ERPGroupActionPerms` | Nhóm quyền thao tác | `ERP` | `Idseq` (BIGSERIAL) |
| 11 | `_ERPTblGrp` | Phân nhóm bảng kỹ thuật | `ERP` | `IdSeq` (UUIDv7) |
| 12 | `_ERPTblGrpItem` | Chi tiết phân nhóm bảng kỹ thuật | `ERP` | `IdSeq` (UUIDv7) |
| 13 | `_ERPTblGrpPerm` | Quyền nhóm bảng kỹ thuật | `ERP` | `IdSeq` (UUIDv7) |
| 14 | `_ERPTblGrpPermRole` | Gán quyền nhóm bảng kỹ thuật cho Role/User | `ERP` | `IdSeq` (UUIDv7) |
| 15 | `_ERPLanguage` | Danh mục đa ngôn ngữ | `ERP` | `LanguageSeq` (INTEGER) |
| 16 | `_ERPDictionary` | Từ điển đa ngôn ngữ giao diện | `ERP` | `IdSeq` (BIGSERIAL) |
| 17 | `_ERPDictVer` | Quản lý phiên bản từ điển O(1) | `ERP` | `LanguageSeq` (INTEGER) |


| 18 | `_ERPAppTabs` | Tabs màn hình ứng dụng | `ERP` | `IdSeq` (UUIDv7) |
| 19 | `_ERPAppScreens` | Danh mục màn hình ứng dụng | `ERP` | `IdSeq` (UUIDv7) |
| 20 | `_ERPAppGroupRole` | Nhóm Role ứng dụng | `ERP` | `IdSeq` (UUIDv7) |
| 21 | `_ERPAppUserRole` | Gán User vào nhóm Role ứng dụng | `ERP` | `IdSeq` (UUIDv7) |
| 22 | `_ERPPermActions` | Đăng ký danh mục hành động quyền hạn | `ERP` | `IdSeq` (UUIDv7) |
| 23 | `_ERPSysAttrGroups` | Đăng ký nhóm thuộc tính hệ thống (SCOPE_LEVEL, RULE_CONDITION, DOC_STATUS...) | `ERP` | `IdSeq` (UUIDv7) |
| 24 | `_ERPSysAttrItems` | Đăng ký chi tiết giá trị thuộc tính hệ thống | `ERP` | `IdSeq` (UUIDv7) |
| 25 | `_ERPPermScopes` | Đăng ký quy tắc phạm vi dữ liệu theo hành động | `ERP` | `IdSeq` (UUIDv7) |
| 26 | `_ERPPermFields` | Đăng ký trường dữ liệu phân quyền | `ERP` | `IdSeq` (UUIDv7) |


---

## 🛠️ 3. Câu Lệnh SQL DDL Khởi Tạo & Cập Nhật

### 📌 LỆNH SQL MIGRATION TOÀN DIỆN: ĐỔI TÊN BẢNG & CHUYỂN USERSEQ SỐ CŨ SANG UUIDv7
Nếu bạn có cơ sở dữ liệu cũ đang dùng tên bảng `_WEB` và `UserSeq` dạng số cũ, hãy chạy đoạn SQL này để **tự động đổi tên bảng, chuyển kiểu dữ liệu và nâng cấp toàn bộ UserSeq cũ sang UUIDv7**:

```sql
-- ============================================================================
-- CHẠY TRÊN DATABASE ERP:
-- ============================================================================

-- 1. Đổi tên toàn bộ bảng cũ _WEB sang bảng chuẩn mới
ALTER TABLE IF EXISTS "_ERPUser_WEB"        RENAME TO "_ERPUsers";
ALTER TABLE IF EXISTS "_ERPRolesUsers_WEB"  RENAME TO "_ERPRolesUsers";
ALTER TABLE IF EXISTS "_ERPGroups_WEB"      RENAME TO "_ERPGroups";
ALTER TABLE IF EXISTS "_ERPMenus_WEB"       RENAME TO "_ERPMenus";
ALTER TABLE IF EXISTS "_ERPRootMenus_WEB"   RENAME TO "_ERPRootMenus";
ALTER TABLE IF EXISTS "_ERPLanguage_WEB"    RENAME TO "_ERPLanguage";
ALTER TABLE IF EXISTS "_ERPDictionary_WEB"  RENAME TO "_ERPDictionary";

-- 2. Chuyển kiểu dữ liệu tất cả các cột UserSeq, CreatedBy, UpdatedBy sang VARCHAR(36)
ALTER TABLE "_ERPUsers"          ALTER COLUMN "UserSeq" TYPE VARCHAR(36) USING "UserSeq"::VARCHAR(36);
ALTER TABLE "_ERPRolesUsers"     ALTER COLUMN "UserSeq" TYPE VARCHAR(36) USING "UserSeq"::VARCHAR(36);
ALTER TABLE "_ERPRolesUsers"     ALTER COLUMN "CreatedBy" TYPE VARCHAR(36) USING "CreatedBy"::VARCHAR(36);
ALTER TABLE "_ERPRolesUsers"     ALTER COLUMN "UpdatedBy" TYPE VARCHAR(36) USING "UpdatedBy"::VARCHAR(36);
ALTER TABLE "_ERPUserDetails"    ALTER COLUMN "UserSeq" TYPE VARCHAR(36) USING "UserSeq"::VARCHAR(36);
ALTER TABLE "_ERPTblGrpPermRole" ALTER COLUMN "UserSeq" TYPE VARCHAR(36) USING "UserSeq"::VARCHAR(36);
ALTER TABLE "_ERPAppUserRole"    ALTER COLUMN "UserId" TYPE VARCHAR(36) USING "UserId"::VARCHAR(36);

-- 3. Cập nhật UserSeq số cũ (1, 2, 3...) sang UUIDv7 mới trong _ERPUsers và các bảng liên quan:
-- A. Cập nhật cho Admin (Old ID: '1') -> New UUIDv7 Admin
UPDATE "_ERPUsers"          SET "UserSeq"   = '01a00475-d869-7e01-b766-1624d9790252' WHERE "UserSeq"   = '1';
UPDATE "_ERPRolesUsers"     SET "UserSeq"   = '01a00475-d869-7e01-b766-1624d9790252' WHERE "UserSeq"   = '1';
UPDATE "_ERPRolesUsers"     SET "CreatedBy" = '01a00475-d869-7e01-b766-1624d9790252' WHERE "CreatedBy" = '1';
UPDATE "_ERPRolesUsers"     SET "UpdatedBy" = '01a00475-d869-7e01-b766-1624d9790252' WHERE "UpdatedBy" = '1';
UPDATE "_ERPUserDetails"    SET "UserSeq"   = '01a00475-d869-7e01-b766-1624d9790252' WHERE "UserSeq"   = '1';
UPDATE "_ERPTblGrpPermRole" SET "UserSeq"   = '01a00475-d869-7e01-b766-1624d9790252' WHERE "UserSeq"   = '1';
UPDATE "_ERPAppUserRole"    SET "UserId"    = '01a00475-d869-7e01-b766-1624d9790252' WHERE "UserId"    = '1';

-- B. Cập nhật tự động UUIDv7 cho toàn bộ các User khác chưa có UUIDv7 chuẩn
UPDATE "_ERPRolesUsers" ru SET "UserSeq" = u."UserSeq" FROM "_ERPUsers" u WHERE ru."UserId" = u."UserId";

-- ============================================================================
-- CHẠY TRÊN DATABASE ERPLOG:
-- ============================================================================
ALTER TABLE IF EXISTS "_ERPLoginFullLogs" RENAME COLUMN "LogSeq" TO "IdSeq";
ALTER TABLE IF EXISTS "_ERPLoginFullLogs" ADD COLUMN IF NOT EXISTS "Login" VARCHAR(100);
ALTER TABLE IF EXISTS "_ERPLoginFullLogs" ALTER COLUMN "UserSeq" TYPE VARCHAR(36) USING "UserSeq"::VARCHAR(36);
```

---

### 1. Bảng Tài Khoản Người Dùng Chuẩn (`_ERPUsers` - Trên DB `ERP`)

```sql
DROP TABLE IF EXISTS "_ERPUsers" CASCADE;

CREATE TABLE "_ERPUsers" (
    "UserSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7 Tăng bảo mật hệ thống
    "CompanySeq"         INTEGER,
    "IdxNo"              INTEGER,
    "EmpID"              VARCHAR(50),
    "EmpCode"            VARCHAR(50),
    "EmpName"            VARCHAR(255),
    "DeptName"           VARCHAR(255),
    "ManagerName"        VARCHAR(255),
    "UserId"             VARCHAR(100),
    "UserType"           INTEGER,
    "UserName"           VARCHAR(255),
    "EmpSeq"             INTEGER,
    "LoginPwd"           TEXT,
    "Password1"          TEXT,
    "Password2"          TEXT,
    "Password3"          TEXT,
    "LoginStatus"        INTEGER,
    "LoginDate"          VARCHAR(50),
    "PwdChgDate"         VARCHAR(50),
    "PassHis"            TEXT,
    "Email"              VARCHAR(255),
    "IsOtpVerified"      BOOLEAN DEFAULT false,
    "IsEmailVerified"    BOOLEAN DEFAULT false,
    "LoginFailCnt"       INTEGER DEFAULT 0,
    "PwdType"            VARCHAR(50),
    "LoginType"          INTEGER,
    "ManagementType"     INTEGER,
    "LastUserSeq"        VARCHAR(36),
    "LastDateTime"       TIMESTAMPTZ,
    "Dsn"                VARCHAR(255),
    "Remark"             TEXT,
    "UserlimitDate"      VARCHAR(50),
    "LoginFailFirstTime" TIMESTAMPTZ,
    "IsLayoutAdmin"      INTEGER,
    "IsGroupWareUser"    VARCHAR(10),
    "SMUserType"         INTEGER,
    "LicenseType"        INTEGER,
    "CheckPass1"         BOOLEAN DEFAULT false,
    "StatusAcc"          BOOLEAN DEFAULT true,
    "Status"             VARCHAR(50),
    "Active"             BOOLEAN DEFAULT true,
    "LanguageSeq"        INTEGER DEFAULT 1,
    "CreatedBy"          VARCHAR(36),
    "CreatedAt"          TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"          VARCHAR(36),
    "UpdatedAt"          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_userid" ON "_ERPUsers" ("UserId");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "_ERPUsers" ("Active");

-- 📌 SEED SQL NẠP TOÀN BỘ DỮ LIỆU TÀI KHOẢN (Đã kích hoạt CheckPass1 = true)
INSERT INTO "_ERPUsers" (
    "UserSeq", "IdxNo", "UserId", "UserName", "Password2", "CheckPass1", "StatusAcc", "Active", "CreatedAt", "UpdatedAt"
) VALUES
    ('01a00475-d869-7e01-b766-1624d9790252', 1, 'admin', 'admin', '$2b$10$CjPnS4ino3LygUVFZShS8.ru52TCwkA5XnViMBGIfB3eRVLd8geB2', true, false, true, '2025-02-01 18:04:15.283', '2025-02-01 18:04:15.283'),
    ('01a00475-d869-7e02-b66c-dfae1e2d5eed', 3, 'A3', 'A3', '$2b$10$FCH9WP5t0QbOMOcUF67S5On9aLcEyz6dSFZhZvva0BB/sNqsVIsfy', true, false, true, '2025-05-18 21:33:39.059', '2025-08-20 16:19:56.575'),
    ('01a00475-d869-7e03-b419-9810d8883456', 6, 'A6', 'A6', '$2b$10$Nng0oJEodjmEjJFx8Xt/Y.bfyKybsx5CFYYWk4Uy5sH13YYOCNnHW', true, false, true, '2025-05-18 21:56:51.435', '2025-08-20 16:19:56.575'),
    ('01a00475-d869-7e04-9e87-259733224041', 5, 'A7', 'A7', '$2b$10$o4KouGAvc08wVNqk3KQ.y.lFJzALJ2GeRYN7hqlGwrrYuZC82T5MC', true, false, true, '2025-05-18 21:58:44.469', '2025-08-20 16:19:56.575'),
    ('01a00475-d869-7e05-8968-cd32958b2569', 7, 'A8', 'Hoàng Văn Tuấn', '$2b$10$y56u5FFpnszKGuSf5zB82.jGbM1QtKAi9CbEQb0sCKRGl7nOhJPcG', true, false, true, '2025-06-03 23:19:14.297', '2025-08-20 16:19:56.575'),
    ('01a00475-d869-7e06-a785-30dd3f1febc6', 4, 'A5', 'A5', '$2b$10$0O7yHEb/xcN3V0fZ66CT..WQGohkRg0Ls.IPzUGWqcOgASw32UQfm', true, false, true, '2025-05-18 21:37:23.540', '2025-08-20 16:20:51.363'),
    ('01a00475-d869-7e07-ba72-df4d6b23ea42', 8, 'A9', 'B', '$2b$10$wobD.L3Iz2SLxkA6RguWGOsPMOm6Hn.YXQDvy2.LFMcsdw4PB/B3u', true, false, true, '2025-08-22 15:56:17.773', '2025-08-26 16:02:38.911'),
    ('01a00475-d869-7e08-b8de-66dba0243c26', 2, 'A2', 'A2', '$2b$10$YV.ZCOLQT9dzY2lfC1HA.eQf2PNkTCEavmW2GB0jw2hTm2AOFOG2G', true, false, true, '2025-05-18 21:31:18.886', '2025-08-26 16:13:16.115'),
    ('01a00475-d869-7e09-92fc-d01dda22e857', 9, 'A', 'A', '$2a$10$fXy1EgJlXmdVlg/0kbVEFObh1zHdXE5607YUgchj3WX0kW1MEUZkm', true, false, true, '2026-05-03 15:30:13.334', '2026-05-03 15:30:13.334'),
    ('01a00475-d869-7e0a-9285-bf8ad1d1b4db', 10, 'AD', 'AD', '$2a$10$fKkYwAXAssaiteP6grrG2OK3u/wXoCS1ulF7Z/EafYipbPrAvhT62', true, false, true, '2026-05-03 15:47:58.823', '2026-05-03 15:47:58.823'),
    ('01a00475-d869-7e0b-8518-74860348bf98', 11, 'acc01', 'acc01', '$2a$10$szqMHmkTnRE.5Wy3qQIAU.NVF6KFZ.c68RtNpXTyM3/iGVnUQb3XW', true, false, true, '2026-05-03 15:53:03.041', '2026-05-03 15:53:03.041'),
    ('01a00475-d869-7e0c-9ce5-fa5c1b4df39b', 12, 'acc02', 'acc02', '$2a$10$oeHOq.g3I0cTZeVFcx4bYu8k0pm42/ucJUBLL3yGFZWlXZWZjSJbm', true, false, true, '2026-05-03 15:55:49.482', '2026-05-03 15:55:49.482'),
    ('01a00475-d869-7e0d-bb82-fbf26cefc675', 13, 'acc03', 'acc03', '$2a$10$WkfPcab2LSAQfblCskFAB.cOxAo80BLQ0AQ2nkzXYEcY7qExEfzEy', true, false, true, '2026-05-03 15:58:37.166', '2026-05-03 15:58:37.166'),
    ('01a00475-d869-7e0e-8611-bbad791fc469', 14, 'acc04', 'acc04', '$2a$10$Pxs6S8jH48r.rfGRn9h2peNQYo/7gzBKik4PznGElbsWwE7ekbgte', true, false, true, '2026-05-03 16:02:55.100', '2026-05-03 16:02:55.100'),
    ('01a00475-d869-7e0f-960f-7dbb737733f6', 15, 'acc05', 'acc05', '$2a$10$hsOWtbhGu8Mipw4iuYuQf.9S8i/om.GYNjVx1B7MoAKfulgjqmvR.', true, false, true, '2026-05-03 16:03:29.860', '2026-05-03 16:03:29.860'),
    ('01a00475-d869-7e10-995d-2ae9d1750d7d', 16, 'acc06', 'acc06', '$2a$10$0fZYiAjVtKobhbxbIFdUt.z0yB6zgBJ1tLPaQ79V7eYlLVdIL9B8S', true, false, true, '2026-05-03 16:10:00.213', '2026-05-03 16:10:00.213'),
    ('01a00475-d869-7e11-8cba-5e4acd4e7fc3', 1, 'A1', 'A1', '$2a$10$U22BFfTRGnAh3l7tbB1qp.mqZ/085kmrd7JBwPrUCfAt8rG.EOUDe', true, false, true, '2025-05-18 21:29:50.980', '2025-08-28 13:47:09.576')
ON CONFLICT ("UserSeq") DO NOTHING;
```

---

### 2. Bảng Nhật Ký Đăng Nhập (`_ERPLoginFullLogs` - Trên DB `ERPLOG`)

```sql
DROP TABLE IF EXISTS "_ERPLoginFullLogs" CASCADE;

CREATE TABLE "_ERPLoginFullLogs" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "UserSeq"          VARCHAR(36),             -- UUIDv7 liên kết với _ERPUsers
    "Login"            VARCHAR(100),            -- Tên tài khoản đăng nhập
    "IdxNo"            INTEGER,
    "DeviceId"         VARCHAR(255),
    "StatusLogs"       VARCHAR(50),
    "DeviceInfoWeb"    TEXT,
    "DeviceInfoSoft"   TEXT,
    "DeviceInfoApp"    TEXT,
    "DeviceInfoWebIV"  TEXT,
    "DeviceInfoSoftIV" TEXT,
    "DeviceInfoAppIV"  TEXT,
    "PlatformStatus"   VARCHAR(50),
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_login_logs_userseq" ON "_ERPLoginFullLogs" ("UserSeq");
CREATE INDEX IF NOT EXISTS "idx_login_logs_createdat" ON "_ERPLoginFullLogs" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_login_logs_login" ON "_ERPLoginFullLogs" ("Login");
```

---

### 3. Bảng Audit Log Kiểm Toán (`_SysFullAuditLog` - Trên DB `ERPLOG`)

```sql
DROP TABLE IF EXISTS "_SysFullAuditLog" CASCADE;

CREATE TABLE "_SysFullAuditLog" (
    "IdSeq"        VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ModuleName"   VARCHAR(100),
    "ServiceName"  VARCHAR(100),
    "MethodName"   VARCHAR(100),
    "ActionType"   VARCHAR(50),
    "UrlPath"      TEXT,
    "RequestData"  TEXT,
    "ResponseData" TEXT,
    "StatusCode"   INTEGER,
    "StatusMsg"    VARCHAR(255),
    "DurationMs"   BIGINT,
    "UserSeq"      VARCHAR(36), -- UUIDv7 đồng bộ với _ERPUsers
    "UserLogin"    VARCHAR(100),
    "ClientIp"     VARCHAR(50),
    "Token"        TEXT,
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_userseq" ON "_SysFullAuditLog" ("UserSeq");
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_createdat" ON "_SysFullAuditLog" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_sys_audit_log_module" ON "_SysFullAuditLog" ("ModuleName");
```

---

### 3b. Bảng Biến Động Dữ Liệu Từng Hàng & Cột (`_SysDataChangeLog`, `_SysDataChangeRowLog`, `_SysDataChangeDetail` - Trên DB `ERPLOG`)

#### Bảng Master Lô Save Sheet (`_SysDataChangeLog`)
```sql
CREATE TABLE IF NOT EXISTS "_SysDataChangeLog" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ApiMethod"        VARCHAR(100) NOT NULL,   -- Ví dụ: UsersAuthU, UsersAuthA
    "TableName"        VARCHAR(100) NOT NULL,   -- Ví dụ: _ERPUsers, _ERPMenus
    "TotalRecords"     INTEGER DEFAULT 0,
    "SuccessCount"     INTEGER DEFAULT 0,
    "FailedCount"      INTEGER DEFAULT 0,
    "OverallStatus"    VARCHAR(20),             -- SUCCESS, PARTIAL_SUCCESS, FAILED
    "UserSeq"          VARCHAR(36),             -- ID người dùng
    "UserLogin"        VARCHAR(100),            -- Tài khoản đăng nhập
    "ClientIp"         VARCHAR(50),
    "DeviceInfoWeb"    TEXT,
    "DeviceInfoSoft"   TEXT,
    "DeviceInfoApp"    TEXT,
    "PlatformStatus"   VARCHAR(50),
    "TraceId"          VARCHAR(36),
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_datachange_createdat" ON "_SysDataChangeLog" ("CreatedAt" DESC);
```

#### Bảng Chi Tiết Từng Hàng Trong Sheet (`_SysDataChangeRowLog`)
```sql
CREATE TABLE IF NOT EXISTS "_SysDataChangeRowLog" (
    "IdSeq"            VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "ChangeLogSeq"     VARCHAR(36) NOT NULL,    -- FK -> _SysDataChangeLog.IdSeq
    "TableName"        VARCHAR(100) NOT NULL,
    "RecordId"         VARCHAR(100) NOT NULL,   -- Khóa chính ID/UserSeq của hàng
    "RowIdx"           INTEGER,
    "ActionType"       VARCHAR(10)  NOT NULL,   -- 'A' (Add), 'U' (Update), 'D' (Delete)
    "Status"           VARCHAR(20)  NOT NULL,   -- 'SUCCESS' hoặc 'FAILED'
    "ErrorCode"        VARCHAR(50),
    "ErrorMsg"         TEXT,
    "SubmittedData"    TEXT,                    -- JSON dữ liệu gửi lên cho dòng này
    "CreatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_rowlog_table_record" ON "_SysDataChangeRowLog" ("TableName", "RecordId", "CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_rowlog_changelogseq" ON "_SysDataChangeRowLog" ("ChangeLogSeq");
```

#### Bảng Biến Động Cột Old ➔ New (`_SysDataChangeDetail`)
```sql
CREATE TABLE IF NOT EXISTS "_SysDataChangeDetail" (
    "IdSeq"        VARCHAR(36) PRIMARY KEY, -- UUIDv7
    "RowLogSeq"    VARCHAR(36) NOT NULL,    -- FK -> _SysDataChangeRowLog.IdSeq
    "FieldName"    VARCHAR(100) NOT NULL,   -- Tên cột bị sửa (Email, Active,...)
    "OldValue"     TEXT,                    -- Giá trị cũ
    "NewValue"     TEXT,                    -- Giá trị mới
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_detail_rowlogseq" ON "_SysDataChangeDetail" ("RowLogSeq");
```

---

### 4. Bảng Chi Tiết Nhân Viên (`_ERPUserDetails`)

```sql
CREATE TABLE IF NOT EXISTS "_ERPUserDetails" (
    "IdSeq"         BIGSERIAL PRIMARY KEY,
    "UserSeq"       VARCHAR(36), -- UUIDv7 liên kết với _ERPUsers
    "PartSeq"       INTEGER,
    "ProdDepartSeq" INTEGER,
    "PositionSeq"   INTEGER,
    "CanScanQR"     BOOLEAN DEFAULT false,
    "IsActive"      BOOLEAN DEFAULT true,
    "IdxNo"         INTEGER,
    "CreatedBy"     VARCHAR(36),
    "CreatedAt"     TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"     VARCHAR(36),
    "UpdatedAt"     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_userdetails_userseq" ON "_ERPUserDetails" ("UserSeq");
```

---

### 5. Bảng Phân Quyền User/Role/Menu (`_ERPRolesUsers`)

```sql
CREATE TABLE IF NOT EXISTS "_ERPRolesUsers" (
    "Id"         BIGSERIAL PRIMARY KEY,
    "View"       BOOLEAN DEFAULT false,
    "IdxNo"      INTEGER,
    "Edit"       BOOLEAN DEFAULT false,
    "Create"     BOOLEAN DEFAULT false,
    "Delete"     BOOLEAN DEFAULT false,
    "RootMenuId" INTEGER,
    "MenuId"     INTEGER,
    "GroupId"    INTEGER,
    "UserId"     VARCHAR(100),
    "UserSeq"    VARCHAR(36), -- UUIDv7
    "Type"       VARCHAR(50),
    "Name"       VARCHAR(255),
    "CreatedBy"  VARCHAR(36),
    "CreatedAt"  TIMESTAMPTZ DEFAULT NOW(),
    "UpdatedBy"  VARCHAR(36),
    "UpdatedAt"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_roles_users_userid" ON "_ERPRolesUsers" ("UserId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_menuid" ON "_ERPRolesUsers" ("MenuId");
CREATE INDEX IF NOT EXISTS "idx_roles_users_groupid" ON "_ERPRolesUsers" ("GroupId");
```

---

### 6. Bảng Phiên Bản Từ Điển (`_ERPDictVer`)

Bảng này lưu phiên bản hiện tại của từ điển theo từng ngôn ngữ. Mỗi
`LanguageSeq` chỉ có một dòng, nên thao tác đọc và cập nhật đều dùng được
khóa chính để tra cứu O(1).

```sql
CREATE TABLE IF NOT EXISTS "_ERPDictVer" (
	"LanguageSeq"  INTEGER PRIMARY KEY,
	"LanguageCode" VARCHAR(20) NOT NULL UNIQUE,
	"VersionHash"  VARCHAR(128) NOT NULL,
	"UpdatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_erp_dict_ver_language_code"
ON "_ERPDictVer" ("LanguageCode");
```

### 7 - 20. Các Bảng Kỹ Thuật & Danh Mục Còn Lại

Các bảng danh mục và kỹ thuật tiếp tục áp dụng quy tắc đặt tên **PascalCase / UpperCamelCase** chuẩn hóa (bỏ các hậu tố dư thừa `_WEB`):

- `_ERPGroups` (Nhóm người dùng)
- `_ERPMenus` (Danh mục menu con)
- `_ERPRootMenus` (Danh mục menu gốc)
- `_ERPLanguage` (Danh mục ngôn ngữ)
- `_ERPDictionary` (Từ điển hệ thống)


{

"select \* from \\"\_ERPUser\_WEB\\"": [

	{

		"UserSeq" : 1,

		"CompanySeq" : null,

		"IdxNo" : 1,

		"UserType" : 0,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$CjPnS4ino3LygUVFZShS8.ru52TCwkA5XnViMBGIfB3eRVLd8geB2",

		"Password3" : "$2b$10$CjPnS4ino3LygUVFZShS8.ru52TCwkA5XnViMBGIfB3eRVLd8geB2",

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : "1",

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : true,

		"StatusAcc" : false,

		"Status" : "A",

		"Active" : true,

		"LanguageSeq" : 0,

		"CreatedBy" : 1,

		"CreatedAt" : "2025-02-01T11:04:15.283Z",

		"UpdatedBy" : 1,

		"UpdatedAt" : "2025-02-01T11:04:15.283Z",

		"EmpID" : null,

		"UserId" : "admin",

		"UserName" : "admin",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 15,

		"CompanySeq" : null,

		"IdxNo" : 3,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$FCH9WP5t0QbOMOcUF67S5On9aLcEyz6dSFZhZvva0BB\\/sNqsVIsfy",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2025-05-18T14:33:39.059Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-20T09:19:56.575Z",

		"EmpID" : null,

		"UserId" : "A3",

		"UserName" : "A3",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 17,

		"CompanySeq" : null,

		"IdxNo" : 6,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$Nng0oJEodjmEjJFx8Xt\\/Y.bfyKybsx5CFYYWk4Uy5sH13YYOCNnHW",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : 1,

		"CreatedAt" : "2025-05-18T14:56:51.435Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-20T09:19:56.575Z",

		"EmpID" : null,

		"UserId" : "A6",

		"UserName" : "A6",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 18,

		"CompanySeq" : null,

		"IdxNo" : 5,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$o4KouGAvc08wVNqk3KQ.y.lFJzALJ2GeRYN7hqlGwrrYuZC82T5MC",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : true,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : true,

		"LanguageSeq" : 0,

		"CreatedBy" : 1,

		"CreatedAt" : "2025-05-18T14:58:44.469Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-20T09:19:56.575Z",

		"EmpID" : null,

		"UserId" : "A7",

		"UserName" : "A7",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 19,

		"CompanySeq" : null,

		"IdxNo" : 7,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$y56u5FFpnszKGuSf5zB82.jGbM1QtKAi9CbEQb0sCKRGl7nOhJPcG",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : 1,

		"CreatedAt" : "2025-06-03T16:19:14.297Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-20T09:19:56.575Z",

		"EmpID" : "",

		"UserId" : "A8",

		"UserName" : "Hoàng Văn Tuấn",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 16,

		"CompanySeq" : null,

		"IdxNo" : 4,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$0O7yHEb\\/xcN3V0fZ66CT..WQGohkRg0Ls.IPzUGWqcOgASw32UQfm",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : true,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : true,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2025-05-18T14:37:23.540Z",

		"UpdatedBy" : 1,

		"UpdatedAt" : "2025-08-20T09:20:51.363Z",

		"EmpID" : null,

		"UserId" : "A5",

		"UserName" : "A5",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 41,

		"CompanySeq" : null,

		"IdxNo" : 8,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$wobD.L3Iz2SLxkA6RguWGOsPMOm6Hn.YXQDvy2.LFMcsdw4PB\\/B3u",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : true,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : 1,

		"CreatedAt" : "2025-08-22T08:56:17.773Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-26T09:02:38.911Z",

		"EmpID" : "",

		"UserId" : "A9",

		"UserName" : "B",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 14,

		"CompanySeq" : null,

		"IdxNo" : 2,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2b$10$YV.ZCOLQT9dzY2lfC1HA.eQf2PNkTCEavmW2GB0jw2hTm2AOFOG2G",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2025-05-18T14:31:18.886Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-26T09:13:16.115Z",

		"EmpID" : null,

		"UserId" : "A2",

		"UserName" : "A2",

		"Email" : null,

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 42,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$fXy1EgJlXmdVlg\\/0kbVEFObh1zHdXE5607YUgchj3WX0kW1MEUZkm",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T08:30:13.334Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T08:30:13.334Z",

		"EmpID" : "",

		"UserId" : "A",

		"UserName" : "A",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 43,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$fKkYwAXAssaiteP6grrG2OK3u\\/wXoCS1ulF7Z\\/EafYipbPrAvhT62",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T08:47:58.823Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T08:47:58.823Z",

		"EmpID" : "",

		"UserId" : "AD",

		"UserName" : "AD",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 44,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$szqMHmkTnRE.5Wy3qQIAU.NVF6KFZ.c68RtNpXTyM3\\/iGVnUQb3XW",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T08:53:03.041Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T08:53:03.041Z",

		"EmpID" : "",

		"UserId" : "acc01",

		"UserName" : "acc01",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 45,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$oeHOq.g3I0cTZeVFcx4bYu8k0pm42\\/ucJUBLL3yGFZWlXZWZjSJbm",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T08:55:49.482Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T08:55:49.482Z",

		"EmpID" : "",

		"UserId" : "acc02",

		"UserName" : "acc02",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 46,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$WkfPcab2LSAQfblCskFAB.cOxAo80BLQ0AQ2nkzXYEcY7qExEfzEy",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T08:58:37.166Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T08:58:37.166Z",

		"EmpID" : "",

		"UserId" : "acc03",

		"UserName" : "acc03",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 47,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$Pxs6S8jH48r.rfGRn9h2peNQYo\\/7gzBKik4PznGElbsWwE7ekbgte",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T09:02:55.100Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T09:02:55.100Z",

		"EmpID" : "",

		"UserId" : "acc04",

		"UserName" : "acc04",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 48,

		"CompanySeq" : null,

		"IdxNo" : null,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$hsOWtbhGu8Mipw4iuYuQf.9S8i\\/om.GYNjVx1B7MoAKfulgjqmvR.",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T09:03:29.860Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T09:03:29.860Z",

		"EmpID" : "",

		"UserId" : "acc05",

		"UserName" : "acc05",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 49,

		"CompanySeq" : null,

		"IdxNo" : 16,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$0fZYiAjVtKobhbxbIFdUt.z0yB6zgBJ1tLPaQ79V7eYlLVdIL9B8S",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : false,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2026-05-03T09:10:00.213Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2026-05-03T09:10:00.213Z",

		"EmpID" : "",

		"UserId" : "acc06",

		"UserName" : "acc06",

		"Email" : "",

		"IsOtpVerified" : true,

		"IsEmailVerified" : false

	},

	{

		"UserSeq" : 13,

		"CompanySeq" : null,

		"IdxNo" : 1,

		"UserType" : null,

		"EmpSeq" : null,

		"LoginPwd" : null,

		"Password1" : null,

		"Password2" : "$2a$10$U22BFfTRGnAh3l7tbB1qp.mqZ\\/085kmrd7JBwPrUCfAt8rG.EOUDe",

		"Password3" : null,

		"LoginStatus" : null,

		"LoginDate" : null,

		"PwdChgDate" : null,

		"PassHis" : null,

		"LoginFailCnt" : null,

		"PwdType" : null,

		"LoginType" : null,

		"ManagementType" : null,

		"LastUserSeq" : null,

		"LastDateTime" : null,

		"Dsn" : null,

		"Remark" : null,

		"UserlimitDate" : null,

		"LoginFailFirstTime" : null,

		"IsLayoutAdmin" : null,

		"IsGroupWareUser" : null,

		"SMUserType" : null,

		"LicenseType" : null,

		"CheckPass1" : false,

		"StatusAcc" : false,

		"Status" : null,

		"Active" : true,

		"LanguageSeq" : 0,

		"CreatedBy" : null,

		"CreatedAt" : "2025-05-18T14:29:50.980Z",

		"UpdatedBy" : null,

		"UpdatedAt" : "2025-08-28T06:47:09.576Z",

		"EmpID" : null,

		"UserId" : "A1",

		"UserName" : "A1",

		"Email" : null,


---

## 🔐 22. Bảng Đăng Ký Hành Động Quyền Hạn (`_ERPPermActions`)

- **Tên Bảng**: `_ERPPermActions`
- **Mục Đích**: Định nghĩa danh mục chuẩn hóa các hành động/thao tác/nút bấm trên hệ thống (`BTN_SEARCH`, `BTN_CREATE`, `BTN_SAVE`, `BTN_DELETE`, `BTN_APPROVE`, `BTN_LOCK`, `BTN_PRINT`, `BTN_EXPORT_EXCEL`,...).
- **Khóa Chính**: `IdSeq` (UUIDv7 - `VARCHAR(36)`).

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mô Tả |
| :--- | :--- | :--- | :--- |
| `IdSeq` | `VARCHAR(36)` | `PRIMARY KEY` | Khóa chính duy nhất (UUIDv7 bảo mật). |
| `ActionCode` | `VARCHAR(100)` | `NULL` | Mã định danh hành động (vd: `BTN_SEARCH`, `BTN_APPROVE`). |
| `ActionName` | `VARCHAR(255)` | `NULL` | Tên hành động hiển thị trên giao diện. |
| `LangKey` | `VARCHAR(100)` | `NULL` | Khóa từ điển đa ngôn ngữ (vd: `action.search`). |
| `IsDefaultAllow`| `BOOLEAN` | `DEFAULT false` | Mặc định cho phép khi phân quyền mới hay không. |
| `Comment` | `TEXT` | `NULL` | Diễn giải quy tắc nghiệp vụ của hành động. |
| `RowVersion` | `BIGINT` | `DEFAULT 1` | Phiên bản bản ghi (Optimistic Lock). |
| `IdxNo` | `INTEGER` | `NULL` | Thứ tự STT trên giao diện bảng. |
| `CreatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người tạo bản ghi. |
| `CreatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian tạo. |
| `UpdatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người cập nhật gần nhất. |
| `UpdatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian cập nhật gần nhất. |

---

## 🏷️ 23. Bảng Đăng Ký Nhóm Thuộc Tính Hệ Thống (`_ERPSysAttrGroups`)

- **Tên Bảng**: `_ERPSysAttrGroups`
- **Mục Đích**: Bảng cha (Master) định nghĩa các loại/nhóm thuộc tính hệ thống mở rộng dùng chung toàn hệ thống ERP (ví dụ: `SCOPE_LEVEL` - Cấp phạm vi dữ liệu, `RULE_CONDITION` - Điều kiện quy tắc chứng từ, `DOC_STATUS` - Trạng thái chứng từ, `DATA_TYPE` - Kiểu dữ liệu, v.v.).
- **Khóa Chính**: `IdSeq` (UUIDv7 - `VARCHAR(36)`).

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mô Tả |
| :--- | :--- | :--- | :--- |
| `IdSeq` | `VARCHAR(36)` | `PRIMARY KEY` | Khóa chính nhóm thuộc tính (UUIDv7). |
| `GroupCode` | `VARCHAR(100)` | `NOT NULL UNIQUE` | Mã nhóm thuộc tính (vd: `SCOPE_LEVEL`, `RULE_CONDITION`, `DOC_STATUS`). Giá trị duy nhất. |
| `GroupName` | `VARCHAR(255)` | `NULL` | Tên nhóm thuộc tính hiển thị. |
| `CodeHelp` | `BIGINT` | `NOT NULL` | Mã trợ giúp / mã danh mục số phân loại. |
| `LangKey` | `VARCHAR(100)` | `NULL` | Khóa từ điển đa ngôn ngữ. |
| `Comment` | `TEXT` | `NULL` | Ghi chú / Diễn giải nhóm thuộc tính. |
| `RowVersion` | `BIGINT` | `DEFAULT 1` | Phiên bản bản ghi (Optimistic Lock). |
| `IdxNo` | `INTEGER` | `NULL` | Thứ tự STT. |
| `CreatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người tạo bản ghi. |
| `CreatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian tạo. |
| `UpdatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người cập nhật gần nhất. |
| `UpdatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian cập nhật gần nhất. |

---

## 📋 24. Bảng Đăng Ký Chi Tiết Giá Trị Thuộc Tính Hệ Thống (`_ERPSysAttrItems`)

- **Tên Bảng**: `_ERPSysAttrItems`
- **Mục Đích**: Bảng con (Detail) định nghĩa chi tiết từng giá trị/tùy chọn thuộc về một nhóm thuộc tính (ví dụ trong nhóm `SCOPE_LEVEL` có: `ALL`, `BRANCH`, `DEPARTMENT`, `SELF`; trong nhóm `RULE_CONDITION` có: `ALL_STATUS`, `DRAFT_ONLY`, `PENDING_APPROVAL`...).
- **Khóa Chính**: `IdSeq` (UUIDv7 - `VARCHAR(36)`).
- **Liên Kết Logic**: `AttrGroupSeq` lưu `IdSeq` của bảng `_ERPSysAttrGroups`.

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mô Tả |
| :--- | :--- | :--- | :--- |
| `IdSeq` | `VARCHAR(36)` | `PRIMARY KEY` | Khóa chính giá trị thuộc tính (UUIDv7). |
| `AttrGroupSeq` | `VARCHAR(36)` | `NULL` | **Lưu IdSeq của bảng `_ERPSysAttrGroups`**. |
| `AttrValueCode` | `VARCHAR(100)` | `NOT NULL UNIQUE` | Mã giá trị (vd: `ALL`, `BRANCH`, `DRAFT_ONLY`, `PENDING_APPROVAL`). Giá trị duy nhất. |
| `AttrValueName` | `VARCHAR(255)` | `NULL` | Tên giá trị thuộc tính hiển thị. |
| `LangKey` | `VARCHAR(100)` | `NULL` | Khóa từ điển đa ngôn ngữ. |
| `ExtraValue` | `TEXT` | `NULL` | Giá trị cấu hình mở rộng / SQL template (`1=1`, `Status = 0`...). |
| `Comment` | `TEXT` | `NULL` | Ghi chú / Diễn giải chi tiết. |
| `IsActive` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Trạng thái kích hoạt (Bật/Tắt). |
| `RowVersion` | `BIGINT` | `DEFAULT 1` | Phiên bản bản ghi (Optimistic Lock). |
| `IdxNo` | `INTEGER` | `NULL` | Thứ tự STT. |
| `CreatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người tạo bản ghi. |
| `CreatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian tạo. |
| `UpdatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người cập nhật gần nhất. |
| `UpdatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian cập nhật gần nhất. |

---

## 🌐 25. Bảng Đăng Ký Phạm Vi Dữ Liệu (`_ERPPermScopes`)

- **Tên Bảng**: `_ERPPermScopes`
- **Mục Đích**: Định nghĩa quy tắc giới hạn phạm vi truy cập dữ liệu (Data Scope) tương ứng với từng hành động nghiệp vụ (Action), cấp độ phạm vi (ScopeLevel), và điều kiện quy tắc (RuleCondition).
- **Khóa Chính**: `IdSeq` (UUIDv7 - `VARCHAR(36)`).
- **Liên Kết Logic (Không dùng FK cứng)**:
  - `PermActionSeq`: Lưu `IdSeq` của bảng `_ERPPermActions`.
  - `ScopeLevelSeq`: Lưu `IdSeq` của bảng `_ERPSysAttrItems` (thuộc nhóm `SCOPE_LEVEL`).
  - `RuleConditionSeq`: Lưu `IdSeq` của bảng `_ERPSysAttrItems` (thuộc nhóm `RULE_CONDITION`).

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mô Tả |
| :--- | :--- | :--- | :--- |
| `IdSeq` | `VARCHAR(36)` | `PRIMARY KEY` | Khóa chính định danh phạm vi (UUIDv7). |
| `ScopeCode` | `VARCHAR(100)` | `NULL` | Mã quy tắc phạm vi (vd: `SCOPE_VIEW_ALL`, `SCOPE_APPROVE_DEPT`). |
| `ScopeName` | `VARCHAR(255)` | `NULL` | Tên quy tắc phạm vi dữ liệu. |
| `LangKey` | `VARCHAR(100)` | `NULL` | Khóa từ điển đa ngôn ngữ (vd: `scope.view_all`). |
| `PermActionSeq` | `VARCHAR(36)` | `NULL` | **Lưu IdSeq bảng `_ERPPermActions`** (Hành động áp dụng quy tắc). |
| `ScopeLevelSeq` | `VARCHAR(36)` | `NULL` | **Lưu IdSeq bảng `_ERPSysAttrItems`** (Cấp phạm vi dữ liệu). |
| `RuleConditionSeq`| `VARCHAR(36)` | `NULL` | **Lưu IdSeq bảng `_ERPSysAttrItems`** (Điều kiện quy tắc áp dụng). |
| `ConditionSql` | `TEXT` | `NULL` | Đoạn SQL `WHERE` mẫu tự động inject vào câu truy vấn backend. |
| `Comment` | `TEXT` | `NULL` | Ghi chú / Diễn giải chi tiết. |
| `RowVersion` | `BIGINT` | `DEFAULT 1` | Phiên bản bản ghi (Optimistic Lock). |
| `IdxNo` | `INTEGER` | `NULL` | Thứ tự STT. |
| `CreatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người tạo bản ghi. |
| `CreatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian tạo. |
| `UpdatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người cập nhật gần nhất. |
| `UpdatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian cập nhật gần nhất. |


---

## 🔒 26. Bảng Đăng Ký Trường Phân Quyền (`_ERPPermFields`)

- **Tên Bảng**: `_ERPPermFields`
- **Mục Đích**: Đăng ký danh mục các trường dữ liệu trên giao diện/chức năng nghiệp vụ để cấu hình ẩn hiện, phân quyền trường nhạy cảm hoặc che mặt nạ (Data Masking).
- **Khóa Chính**: `IdSeq` (UUIDv7 - `VARCHAR(36)`).

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mô Tả |
| :--- | :--- | :--- | :--- |
| `IdSeq` | `VARCHAR(36)` | `PRIMARY KEY` | Khóa chính định danh trường phân quyền (UUIDv7). |
| `ResourceSeq` | `VARCHAR(50)` | `NOT NULL` | **Lưu Id bảng `_ERPMenus`** (Chức năng áp dụng). |
| `FieldCode` | `VARCHAR(100)` | `NOT NULL` | Mã trường dữ liệu (vd: `Salary`, `PhoneNumber`, `CostPrice`). |
| `FieldName` | `VARCHAR(255)` | `NOT NULL` | Tên hiển thị của trường dữ liệu. |
| `DictSeq` | `BIGINT` | `NULL` | Mã từ điển liên kết (nếu có). |
| `LangKey` | `VARCHAR(100)` | `NULL` | Khóa từ điển đa ngôn ngữ (vd: `field.salary`). |
| `IsMaskable` | `BOOLEAN` | `DEFAULT false` | Cho phép che mặt nạ (***) với các Role không đủ quyền. |
| `IsSensitive` | `BOOLEAN` | `DEFAULT false` | Đánh dấu trường dữ liệu nhạy cảm / bảo mật cao. |
| `OrderNo` | `INTEGER` | `DEFAULT 0` | Thứ tự hiển thị trường dữ liệu. |
| `Comment` | `TEXT` | `NULL` | Ghi chú / Diễn giải chi tiết. |
| `RowVersion` | `BIGINT` | `DEFAULT 1` | Phiên bản bản ghi (Optimistic Lock). |
| `IdxNo` | `INTEGER` | `NULL` | Thứ tự STT. |
| `CreatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người tạo bản ghi. |
| `CreatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian tạo. |
| `UpdatedBy` | `VARCHAR(36)` | `NULL` | UserSeq người cập nhật gần nhất. |
| `UpdatedAt` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Thời gian cập nhật gần nhất. |
