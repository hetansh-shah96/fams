# FAMS — Feature Progress & Roadmap

Last updated: 2026-06-05

---

## PENDING: DB Migrations
Railway DB was unreachable during development. Migration files are committed and will apply automatically on next Railway deploy (`prisma migrate deploy` runs at startup). Tables pending creation:
- `AssetDisposal` + `DisposalMethod` enum → migration `20260605000001`
- `MaintenanceSchedule` → migration `20260605000002`
- `PurchaseOrder` + `POStatus` enum + `purchaseOrderId` on `Asset` → migration `20260605000003`
- `AssetAdjustment` + `AdjustmentType` enum → migration `20260608000001`
- `AssetSplit` + `splitFromId` on `Asset` → migration `20260608000002`
- `rfidTag` on `Asset` → migration `20260608000003`

---

## COMPLETED FEATURES

### 1. Asset Timeline Tab ✅
- New "Timeline" tab on asset detail page
- Aggregates all asset events (creation, transfers, maintenance, audit scans) in one chronological feed
- Color-coded dots per event type; sorted newest-first
- File: `components/assets/asset-detail-client.tsx`

### 2. Asset Disposal Workflow ✅
- `AssetDisposal` model: method (SOLD/SCRAPPED/DONATED/WRITTEN_OFF), disposal date, sale value, buyer, remarks, approved by
- `POST /api/assets/[id]/dispose` — atomically sets status to DISPOSED, creates disposal record, audit logs
- "Dispose Asset" button on asset detail (admin/manager only); shows red modal form; refreshes on success
- Disposal record card shown on disposed assets in the sidebar
- Disposal report updated: now shows real disposal data (method, actual sale proceeds, gain/loss vs net block, approved by)
- Files: `app/api/assets/[id]/dispose/route.ts`, `components/assets/asset-detail-client.tsx`, `app/(dashboard)/reports/disposal/page.tsx`

### 3. Preventive Maintenance Scheduling ✅
- `MaintenanceSchedule` model: per asset+serviceType, tracks frequency (days), next due date, last service date
- API: `POST/GET /api/assets/[id]/schedules`, `PATCH/DELETE /api/assets/[id]/schedules/[sid]`
- Auto-advance: when a maintenance log is created, matching schedule's `nextDueDate` auto-advances by `frequencyDays`
- Asset detail maintenance tab: new "Preventive Schedules" section with add/pause/remove inline UI; color-coded urgency (red=overdue, orange=≤14d)
- Preset frequencies: weekly/monthly/quarterly/half-yearly/yearly/2yr
- Notifications page fixed: now reads `AlertConfig.daysBeforeAlert` per type instead of hardcoded 30 days
- Notifications now also shows already-expired warranty/insurance/PUC (not just upcoming)
- Two new notification sections: overdue preventive schedules + schedules due soon
- Files: `app/api/assets/[id]/schedules/`, `app/(dashboard)/notifications/page.tsx`, `components/assets/asset-detail-client.tsx`

### 4. Purchase Orders / Procurement ✅
- `PurchaseOrder` model: poNumber (unique), supplier, PO date, expected delivery, total amount, status (DRAFT/APPROVED/PARTIALLY_RECEIVED/RECEIVED/CLOSED), notes
- `purchaseOrderId` on `Asset` (optional FK)
- API: `GET/POST /api/purchase-orders`, `GET/PUT /api/purchase-orders/[id]`
- Pages: `/purchase-orders` (list with totals), `/purchase-orders/new`, `/purchase-orders/[id]` (detail with linked assets table), `/purchase-orders/[id]/edit`
- PO detail: inline status change dropdown, shows supplier contact info, asset cost total vs PO value
- Asset form: PO selector added to financial tab (shows open/non-closed POs)
- Asset detail financials card: shows linked PO number with link
- Sidebar: new "Procurement" group with Purchase Orders + New PO
- Files: `app/(dashboard)/purchase-orders/`, `app/api/purchase-orders/`, `components/purchase-orders/`

---

## RECENTLY COMPLETED

### 5. Asset Value Adjustment / Revaluation ✅
- `AssetAdjustment` model: type (REVALUATION_UP/REVALUATION_DOWN/COST_CORRECTION/PARTIAL_WRITE_OFF), adjustment date, previous/new cost, signed adjustment amount, reason, approved by
- `POST /api/assets/[id]/adjust` — atomically updates `Asset.purchaseCost` and creates adjustment record (rejects if asset disposed or result would be negative cost)
- "Adjust Value" button on asset detail (admin/manager only, hidden when disposed) → modal with type/date/amount/reason and live cost preview
- "Value Adjustment History" card on asset detail sidebar showing all past adjustments with before/after cost and approver
- Integrated into the Timeline tab as a new "adjustment" event type (emerald dot, calculator icon)
- Files: `app/api/assets/[id]/adjust/route.ts`, `components/assets/asset-detail-client.tsx`, migration `20260608000001_add_asset_adjustment`

---

## REMAINING FEATURES (from gap analysis vs AssetThread / Paessler)

---

## RECENTLY COMPLETED (cont.)

### 6. Bulk Operations ✅
- `POST /api/assets/bulk` — single endpoint handling `TRANSFER` and `STATUS_UPDATE` actions across an array of asset IDs (zod discriminated union); creates `AssetAllocation` records + audit logs per asset for transfers, skips disposed assets for status updates
- Asset list: checkbox column (select-all + per-row), floating action bar appears when ≥1 selected showing count, "Bulk Transfer" and "Update Status" buttons, clear-selection (X)
- `BulkTransferModal` — to-location/department/date/notes form
- `BulkStatusModal` — status dropdown (excludes DISPOSED)
- Files: `app/api/assets/bulk/route.ts`, `components/assets/asset-list-client.tsx`, `app/(dashboard)/assets/page.tsx` (now also queries departments)

---

## REMAINING FEATURES (from gap analysis vs AssetThread / Paessler)

---

## RECENTLY COMPLETED (cont.)

### 7. Asset Split ✅
- `AssetSplit` model: parent asset (unique), split date, reason, child count, approved by; `Asset.splitFromId` self-relation links each child back to its parent
- `POST /api/assets/[id]/split` — generates N new asset records (new codes via `generateAssetCode`, inherit category/location/department/supplier/PO from parent), retires the parent (`status: RETIRED`), creates the `AssetSplit` record, audit logs (rejects disposed assets or assets already split)
- "Split Asset" button on asset detail (admin/manager, hidden once disposed/already split) → modal with dynamic add/remove rows for child name/serial/cost, live total-vs-original cost comparison
- Asset detail sidebar: "Split From" card (for children, links to parent) and "Split Into N Assets" card (for parents, lists all children with cost and links)
- Files: `app/api/assets/[id]/split/route.ts`, `components/assets/asset-detail-client.tsx`, migration `20260608000002_add_asset_split`

---

## REMAINING FEATURES (from gap analysis vs AssetThread / Paessler)

---

## RECENTLY COMPLETED (cont.)

### 8. Enhanced Supplier Page ✅
- New `/settings/suppliers/[id]` detail page (server-rendered, queries supplier with linked assets + POs)
- `SupplierDetailClient`: stat cards (total asset spend, PO count/value, linked asset count, warranty coverage %), supplier contact info card, linked Purchase Orders table (links to PO detail), linked Assets table (links to asset detail) with status badges
- `MasterCrud` component gained an optional `getViewHref` prop — renders an "Eye" view-link button per row; wired up on the suppliers list page
- Files: `app/(dashboard)/settings/suppliers/[id]/page.tsx`, `components/settings/supplier-detail-client.tsx`, `components/settings/master-crud.tsx`, `app/(dashboard)/settings/suppliers/page.tsx`

---

## REMAINING FEATURES (from gap analysis vs AssetThread / Paessler)

---

## RECENTLY COMPLETED (cont.)

### 9. Reports: PO-wise Asset Register ✅
- New `/reports/po-register` report grouping all assets by their purchase order
- Each PO shown as a card: supplier, status, PO date, PO value vs total linked-asset cost, with a computed variance (red if assets cost more than the PO, green if less)
- Linked assets table per PO (code/name/category/status/cost), links to PO detail and asset detail
- Summary header shows totals across all visible POs (respects branch-manager location scoping)
- Files: `app/(dashboard)/reports/po-register/page.tsx`, `components/layout/sidebar.tsx`

### 10. Dashboard Improvements ✅
- Added an "operational widgets" row to the dashboard with 4 new clickable KPI cards:
  - Open Purchase Orders (status != CLOSED) → links to `/purchase-orders`
  - Pending Disposal Approval (assets with status RETIRED awaiting disposal) → links to filtered asset list
  - Overdue Maintenance Schedules (active schedules with `nextDueDate` in the past) → links to `/notifications`
  - Warranty Expiring This Month (assets with `warrantyExpiry` between now and end of month) → links to `/notifications`
- All four respect branch-manager location scoping like the existing KPIs
- Files: `app/(dashboard)/dashboard/page.tsx`

### 11. Mobile / PWA ✅
- `app/manifest.ts` — generates a web app manifest (name, icons, theme color, standalone display, start_url `/dashboard`)
- `public/sw.js` — service worker: precaches the offline fallback page, network-first for navigations (falls back to cache then `/offline`), cache-first for static assets (js/css/images/fonts)
- `components/pwa/sw-register.tsx` — client component registering the service worker on mount; mounted in root layout
- `app/offline/page.tsx` — friendly offline fallback page
- Root layout (`app/layout.tsx`) gained `manifest`, `appleWebApp`, and `viewport.themeColor` metadata so the app is installable on mobile home screens
- Files: `app/manifest.ts`, `public/sw.js`, `components/pwa/sw-register.tsx`, `app/offline/page.tsx`, `app/layout.tsx`

### 12. RFID Support ✅
- `Asset.rfidTag` (optional, unique) added to schema — stores the RFID tag ID associated with an asset
- Asset form gained an "RFID Tag" input (Basic Details tab); create/update API routes persist it; asset search (`GET /api/assets?search=`) now matches on `rfidTag` (exact) and `serialNumber` (contains) in addition to name/code
- New `/assets/rfid-scanner` page — designed for USB/Bluetooth keyboard-wedge RFID readers (the standard way commercial RFID readers integrate with web apps: they "type" the tag ID + Enter into the focused field at high speed). Captures rapid keystroke bursts (gap < 500ms = reader, longer = human typing), looks up each scanned tag automatically, and builds a running bulk-scan queue showing matched/unmatched results with links to asset detail — ideal for audit sweeps
- Files: `app/(dashboard)/assets/rfid-scanner/page.tsx`, `components/assets/asset-form.tsx`, `app/api/assets/route.ts`, `app/api/assets/[id]/route.ts`, `components/layout/sidebar.tsx`, migration `20260608000003_add_asset_rfid_tag`

---

## NOTES FOR NEXT SESSION

- Railway DB still unreachable from local dev machine — always create manual migration SQL and commit; Railway applies on deploy
- `prisma generate` works offline (updates TS types from schema); `prisma migrate dev/deploy` needs live DB
- Disposal page crash was due to missing migration — fixed by committing SQL files
- Asset form uses `@base-ui/react/select` — `onValueChange` signature is `(v: string | null) => void`
- Zod v4: use `z.record(keySchema, valueSchema)` (two args)
- Auth roles: SUPER_ADMIN > BRANCH_MANAGER > DEPT_HEAD > EMPLOYEE
- Seed: `npm run seed` → admin@fams.com / manager@fams.com / employee@fams.com, password `Admin@123`
