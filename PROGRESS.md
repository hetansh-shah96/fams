# FAMS — Feature Progress & Roadmap

Last updated: 2026-06-05

---

## PENDING: DB Migrations
Railway DB was unreachable during development. Migration files are committed and will apply automatically on next Railway deploy (`prisma migrate deploy` runs at startup). Tables pending creation:
- `AssetDisposal` + `DisposalMethod` enum → migration `20260605000001`
- `MaintenanceSchedule` → migration `20260605000002`
- `PurchaseOrder` + `POStatus` enum + `purchaseOrderId` on `Asset` → migration `20260605000003`
- `AssetAdjustment` + `AdjustmentType` enum → migration `20260608000001`

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

### 6. Bulk Operations 🔲
**What:** Select multiple assets and perform: bulk transfer, bulk status update, bulk assign to department/location.
**UI:** Checkbox column in asset list → floating action bar when items selected
**Complexity:** Medium

### 7. Asset Split 🔲
**What:** Split one asset record into multiple (e.g. a batch purchase split into individual units). Original asset retired; N new assets created with proportional costs.
**Schema needed:** `AssetSplit` model linking parent → children assets
**Complexity:** High

### 8. Enhanced Supplier Page 🔲
**What:** Supplier detail page showing: all linked POs (with totals), all linked assets, supplier performance summary (total spend, asset count, avg warranty hit rate).
**Complexity:** Low–Medium (mostly UI, data already exists via relations)

### 9. Reports: PO-wise Asset Register 🔲
**What:** New report under Reports showing all assets grouped by purchase order, with PO value vs actual asset cost variance.
**Complexity:** Low

### 10. Dashboard Improvements 🔲
**What:** Add widgets for: open POs count, assets pending disposal approval, overdue schedules count, warranty expiring this month. Currently dashboard may be basic.
**Complexity:** Low–Medium

### 11. Mobile / PWA 🔲
**What:** Progressive Web App support — service worker, offline capability, installable on mobile. QR scanner already works on mobile browser.
**Complexity:** High

### 12. RFID Support 🔲
**What:** RFID reader integration for bulk scanning during audits. Would replace/complement QR scanning.
**Complexity:** High / Hardware-dependent

---

## NOTES FOR NEXT SESSION

- Railway DB still unreachable from local dev machine — always create manual migration SQL and commit; Railway applies on deploy
- `prisma generate` works offline (updates TS types from schema); `prisma migrate dev/deploy` needs live DB
- Disposal page crash was due to missing migration — fixed by committing SQL files
- Asset form uses `@base-ui/react/select` — `onValueChange` signature is `(v: string | null) => void`
- Zod v4: use `z.record(keySchema, valueSchema)` (two args)
- Auth roles: SUPER_ADMIN > BRANCH_MANAGER > DEPT_HEAD > EMPLOYEE
- Seed: `npm run seed` → admin@fams.com / manager@fams.com / employee@fams.com, password `Admin@123`
