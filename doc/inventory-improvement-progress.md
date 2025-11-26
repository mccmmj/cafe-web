# Inventory Improvement Progress

Prepared: 2025-11-23

## Status Legend
- 🟢 Done
- 🟡 In progress
- ⚪ Not started

## Tasks Snapshot
- Add Items modal fixes: 🟢
- PO modal UX (quick add collapse, prefilled qty, exclude step): 🟢
- PO out-of-stock handling post-approval: 🟢
- PO list badges for excluded items: 🟢
- Duplicate purchase order: 🟢
- Soft delete/archive inventory items: 🟢
- Pack-size awareness & stock math: 🟢
- Unit cost calculator & history: 🟢
- Invoice unlink/re-upload resilience: ⚪
- Responsive PO table actions: ⚪
- Email delivery feedback/logging: ⚪
- Tests & lint for new flows: ⚪

## Notes
- Report will be updated as each item moves to in-progress/done and when code changes land.
- PO modal: quick-add collapse and reorder prefill done; out-of-stock exclusion added to email send flow and can be toggled post-send/at receipt.
- Unit cost calculator & history — acceptance criteria:
  - Editable unit cost field available in inventory detail and PO line editor, with inline calculator to derive unit cost from pack price and pack_size. ✅
  - Auto-normalize costs to per-unit when pack_size > 1; display both pack and unit views when pack item selected. ✅
  - Persist cost changes with timestamp, user, source (manual edit, PO line, invoice confirm), and previous value. ✅
  - Surface recent cost history (last 5 changes) in inventory detail drawer and PO line hover, with ability to revert to a prior value. ✅
  - Invoice confirmation writes cost history when it updates unit_cost; must not regress current_stock. ✅
  - Validation: unit_cost >= 0, pack_cost >= 0; prevents saving if required data missing. ✅
