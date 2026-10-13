# Chuyen du lieu menu va phan quyen PostgreSQL

## Bang duoc code su dung

| Bang | Vai tro |
| --- | --- |
| `_ERPUsers` | Tai khoan; `UserSeq` la dinh danh khi dang nhap va tra quyen. |
| `_ERPRootMenus` | Module goc, icon, thu tu, Utilities. |
| `_ERPMenus` | Menu/submenu/man hinh; Key, Link, MenuRootId, MenuSubRootId. |
| `_ERPGroups` | Danh muc nhom quyen. |
| `_ERPRolesUsers` | Gan user vao nhom va quyen module/menu/action. |
| `_ERPPermActions` | Danh muc hanh dong tren trang dang ky action. |
| `_ERPActions` | Danh muc action duoc dong bo tu `_ERPPermActions`. |
| `_ERPMenuActions` | Action ap dung cho tung menu; khong phai quyen cap cho user. |
| `_ERPTblGrp` | Danh muc nhom bang du lieu. |
| `_ERPTblGrpItem` | Chi tiet bang/truong trong nhom. |
| `_ERPTblGrpPerm` | Danh muc bo quyen bang du lieu. |
| `_ERPTblGrpPermRole` | Gan user va quyen bang/truong vao bo quyen. |

`_ERPRolesUsers.Type='user'` lien ket UserSeq voi GroupId. Cac dong
`rootmenu`/`root`, `menu`, `submenu`, `menuitem` cap quyen View/Create/Edit/Delete/
Import/Export. Dong `action` dung MenuId + Name (ma action); View la co cho phep
action. Khong duoc xuat chi cac dong menu va bo qua cac dong user/action.

Code doi chieu:
- `service/server-core/internal/service/auth/auth_service.go`: getDataRolesUserRaw,
  tra nhom bang UserSeq, doc menu/action va roleTable.
- `service/server-core/internal/service/auth/navigation_permissions.go`: tra cay
  cha tu `_ERPMenus` va `_ERPRootMenus`.
- `service/server-core/internal/middleware/permissions.go` va
  `service/service-datahub/auth/permissions.go`: kiem tra quyen backend.
- `service/server-core/internal/service/roles/perm_action/perm_action_a.go`:
  dong bo `_ERPPermActions` sang `_ERPActions` va `_ERPMenuActions`.

Cac bang cau hinh mo rong duoc xuat neu co: `_ERPSysAttrGroups`,
`_ERPSysAttrItems`, `_ERPPermFields`, `_ERPPermResourceFields`,
`_ERPPermResourceScopes`, `_ERPGroupActionPerms`, `_ERPGroupActionPermsItems`.
Khong phai tat ca bang mo rong deu duoc middleware hien tai thuc thi.

## DB dich da co bang

Chay `service/server-core/internal/database/export_permissions_data.sql` tren
DB NGUON. Script chi doc bang nguon va tao bang tam; ket qua `sql_script`
chua INSERT/UPDATE voi DU LIEU THAT, khong phai data seed mau.

Trong file, `schema_name` mac dinh la public. `include_users=false`: khong sao
chep tai khoan/mat khau. DB dich phai co dung UserSeq cua cac user duoc gan quyen.
Neu DB dich dung UserSeq khac, can lap bang anh xa theo tai khoan da doi chieu
roi chuyen UserSeq cua cac assignment; khong suy doan theo ten nhan vien.
Chi dat `include_users=true` khi can sao chep nguyen cac tai khoan (gom du lieu
xac thuc) sang DB moi.

Dung psql de ghi ket qua thanh file SQL UTF-8, khong dung redirect PowerShell:

```powershell
psql -X -q -A -t -v ON_ERROR_STOP=1 -h SOURCE_HOST -p 5432 -U SOURCE_USER -d SOURCE_DB -f service/server-core/internal/database/export_permissions_data.sql -o permissions_data.sql
```

File `permissions_data.sql` la SQL can chay tren DB DICH:

```powershell
psql -X -v ON_ERROR_STOP=1 -h TARGET_HOST -p 5432 -U TARGET_USER -d TARGET_DB -f permissions_data.sql
```

Co the chay bang DBeaver/pgAdmin: chay exporter tren nguon, lay NOI DUNG nguyen
cot sql_script (khong xuat CSV co dau quote), roi chay noi dung do tren dich.

Script giu nguyen khoa chinh va cap nhat dong trung khoa. Khong xoa du lieu
cu tren dich; cac quyen cu khong co trong nguon van con. Vi vay day la dong bo
them/cap nhat, khong phai thay the chinh xac toan bo quyen. Neu ID tren dich
da mang y nghia khac, khong chay truc tiep: can anh xa MenuId, RootMenuId,
GroupId va cac IdSeq truoc. Cot/PK cua bang dich phai tuong thich voi nguon.
Script cap nhat sequence de ban ghi tao sau import khong trung ID.

Sau import, chay `check_permissions_data.sql` tren hai DB de doi chieu so dong,
membership va quyen mo coi. Dang xuat/dang nhap lai de nhan snapshot quyen moi.

## Khi DB dich chua co bang

Lay DDL tu DB nguon bang pg_dump de giu dung kieu cot, PK, sequence, index va
constraint dang chay. File `create_erp_tables.sql` trong repo khong bao gom
day du cac cot duoc bo sung qua migration (vi du RowVersion/Import/Export).

```powershell
$tables = @('_ERPUsers','_ERPRootMenus','_ERPMenus','_ERPGroups','_ERPPermActions','_ERPActions','_ERPMenuActions','_ERPRolesUsers','_ERPTblGrp','_ERPTblGrpItem','_ERPTblGrpPerm','_ERPTblGrpPermRole')
$dumpArgs = @('--schema-only','--no-owner','--no-privileges','-h','SOURCE_HOST','-p','5432','-U','SOURCE_USER','-d','SOURCE_DB','--file=permissions_schema.sql')
foreach ($table in $tables) { $dumpArgs += '--table=public."' + $table + '"' }
& pg_dump @dumpArgs
if ($LASTEXITCODE -ne 0) { throw 'Schema export failed' }
```

Neu xuat bang cau hinh mo rong, them cac bang do vao `$tables`. pg_dump theo
table khong tu lay cac bang/type/function ngoai danh sach; kiem tra dependency
trong DDL truoc khi import. Chay `permissions_schema.sql` tren DB dich truoc,
roi chay `permissions_data.sql`.

## Kiem chung

Da thu exporter tren PostgreSQL 17 tam, xuat source sang target va import lai
lan hai: khong trung dong, bao toan boolean false, tieng Viet, dau nhay va
backslash. Da kiem tra self-reference menu cha/con, cot identity/generated,
bang rong, bang chi co PK va sequence sau import. Chua xuat du lieu DB thuc
te cua nguoi dung vi chua co host/ten DB nguon.
