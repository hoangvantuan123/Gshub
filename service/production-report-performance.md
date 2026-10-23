# Production report optimization

Scope: `/api/v2/report/production/{hanoi-gs1,quevo-gs5,summary}/{plan,statistics}`.

## Behavior and compatibility

- The four factory screens request `detailsOnly=true`, `exactBatch=true`, and
  `includeItems=all`. Existing frontend mappers, formulas, filters, drill-downs
  and exports continue to receive every detail row in its original order.
  Backend aggregate calculations that these screens discard are skipped.
- The frontend validates completeness before publishing a dataset. When talking
  to an older backend that still pages at 10,000 rows, it fetches the remaining
  pages; failed, changed-count or repeated pages fail instead of becoming partial KPI data.
- The two summary endpoints retain their aggregate response and existing
  formulas. They select only the columns used by those formulas, do not construct
  detail DTOs, and skip the remark catalog lookup.
- The gateway negotiates `compactTransport` using the existing `filters_json`.
  DataHub sends its report JSON once, without a duplicate protobuf item array.
  The gateway reads that JSON directly and preserves the existing HTTP envelope,
  including string-encoded int64 pagination totals. Native gRPC clients that do
  not request this mode retain their original response.
- Missing master dates are loaded by referenced IDs/codes in bounded batches.
  The dropdown limits of 200/500 masters no longer limit historical date mapping.
  Dropdown contents remain independent of this additional mapping data.
- Groups with equal ranking values have deterministic secondary sort keys.

## Validation

Go tests cover original report fixtures captured from the pre-change code,
20,001-row full/detail/summary equivalence, projected-column equivalence,
pagination totals, date filters, empty reports and missing historical masters.
Gateway tests cover payload encoding, metadata types and legacy fallback.
Frontend tests cover more than 10,000 rows, old backend pagination, envelope
compatibility and incomplete or failed page requests.

Commands from the respective service/software directories:

```text
go test ./...
go test ./services/report/plan_report ./services/report/prod_stats_detail -run ^$ -bench Report20K -benchmem
node --test src/renderer/src/user/page/report/registration/services/completeReportRequest.test.js
npm run build:web
```

## Deployment and measurement

Deploy DataHub, API Gateway and the frontend together. No schema migration or
production database modification is included. A new frontend can load all pages
from the old backend; an old frontend still retains its old 10,000-row behavior.

DataHub logs `rows_read`, `query_duration`, `build_duration`, `response_bytes`
and `encode_duration` to distinguish database time, calculation and JSON encoding.
Compare HTTP p50/p95, payload size and memory with the same filters and concurrent
user load. Local pure calculation benchmarks do not measure production SQL,
network latency, browser rendering or end-to-end API latency.

## Remaining scale boundary

Factory screens still use client-side formulas over the complete selected batch.
Summary formulas still scan matching rows in Go, using a narrower projection.
This change removes redundant work and prevents truncated KPI calculations; it
does not make arbitrary all-history queries constant-time at millions of rows.

For that next architecture, introduce versioned, incrementally maintained rollup
tables and server-side detail pagination, and reconcile each plant's frontend
formulas with the backend before switching KPI sources. Distinct counts,
rounding, waste/runtime rules, time zones and edits/deletes need explicit parity
tests. Choose database indexes from actual `EXPLAIN (ANALYZE, BUFFERS)` results;
this patch does not add speculative indexes or cache responses that can become stale.
