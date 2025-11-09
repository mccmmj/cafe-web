# Invoice Parsing & Matching Overhaul Plan

## Objectives
- **Accuracy**: ≥90% correct extraction for invoice header + line data on top suppliers.
- **Speed**: <60 seconds per invoice for auto parsing; batch-capable for backlog.
- **Trust**: Transparent confidence indicators, low-friction overrides, full audit trail.

## 1. File Intake & Preprocessing
1. **Storage discipline**
   - Store every upload in `invoices` bucket with `file_path`; keep metadata (size/type/digest).
   - Generate signed URLs on demand to avoid public bucket exposure.
2. **PDF-first pipeline**
   - Use `pdfjs-dist` or `pdf-lib` for vector PDFs; extract text with layout info (x/y, font).
   - Generate page images (e.g., `pdfjs.renderPage → canvas`) for fallback OCR or thumbnails.
3. **OCR for raster scans**
   - Run Tesseract (via `tesseract.js`) or a server-side OCR worker (e.g., AWS Textract) when:
     - PDF text extraction yields <1 KB text or low entropy.
     - File type is image (PNG/JPG).
   - Store OCR text + confidence; mark pages needing human review.
4. **Text normalization**
   - Strip headers/footers, merge broken columns, fix common OCR slipups (e.g., `0/O`, `1/l`).
   - Detect table boundaries using heuristics (consistent spaces, line drawing chars).
   - Persist normalized text (`invoices.clean_text`) for replay/testing.

## 2. Supplier-Aware Parsing
1. **Template registry**
   - Add `parsing_templates` per supplier with:
     - Regex for invoice/PO numbers, dates, totals.
     - Column hints (`description`, `qty`, `unit`, `price`, `line total`).
     - Unit conversion rules (case vs. each, lb → oz).
   - UI to edit/test templates; versioning + usage stats.
2. **Multi-pass AI**
   - Prompt LLM (e.g., GPT-4o) with normalized text + template hints, ask for strict JSON (header + items).
   - Validate JSON structure + numeric reconciliation (sum of line totals ≈ invoice total).
   - On failure, run a smaller prompt that isolates missing fields (e.g., “find invoice number only”).
   - If totals mismatch > tolerance, flag for manual review and attach model reasoning.
3. **Deterministic fallbacks**
   - Run regex extraction before AI; if high confidence (PO number, invoice #, totals), trust regex.
   - For line items, attempt column-based slicing (split by double spaces or tabs) when tables are simple.
4. **Data enrichment**
   - Look up supplier defaults (currency, payment terms).
   - Normalize date formats; convert totals to cents to avoid float drift.
   - Attach page/line references so reviewers can jump to source snippet.

## 3. Item & PO Matching
1. **Feature set**
   - Text embeddings for descriptions (OpenAI text-embedding-3-small or locally hosted model).
   - Exact fields: supplier SKU, UPC, case size, unit price.
   - Derived metrics: normalized quantity (case * units), price per base unit, string distance.
2. **Matching engine**
   - Precompute embeddings for inventory items; store in pgvector for cosine search.
   - For each invoice line, shortlist candidates by SKU/unit price ±10%, then rerank by embedding similarity.
   - Expose top 3 suggestions with confidence; auto-accept when confidence ≥0.85.
3. **PO alignment**
   - Filter candidate POs by supplier + date window + status (sent/confirmed).
   - Compare invoice totals vs. PO totals; track variances.
   - Auto-create `order_invoice_matches` when overall confidence ≥0.7; otherwise flag for review.

## 4. Review & Override Experience
1. **Invoice review modal**
   - Header card (invoice #, dates, totals, supplier) with confidence meter.
   - Line items table showing parsed data, suggested match, variance, and status badge.
   - Inline controls: change matched item, edit quantity/unit/price, split/merge lines, mark “not received”.
   - Link to source snippet/page preview for quick verification.
2. **PO modal integration**
   - New “Supplier Invoices” section listing linked invoices, status, match confidence, and quick actions (view details, open file, unlink).
   - Buttons to link existing invoice or upload new one (prefilled with supplier/PO info).
3. **Auditability**
   - Record reviewer, timestamp, before/after values for every override.
   - Option to “promote” a manual correction into the supplier’s parsing template for future runs.

## 5. Workflow & Observability
1. **Status transitions**
   - `uploaded → parsing → parsed → reviewing → matched → confirmed` (or `error`).
   - Auto-trigger parsing on upload; queue retries with exponential backoff on transient errors.
2. **Notifications**
   - Slack/email when parsing fails, or when invoices sit in `reviewing` > N days.
   - Dashboard widget with outstanding tasks per reviewer.
3. **Metrics**
   - Parse success rate, average confidence by supplier, manual override rate.
   - Matching accuracy: % of lines auto-matched vs. manually overridden.
   - Latency tracking for each pipeline stage (OCR, AI, matching).

## 6. Testing & Rollout
1. **Corpus-based regression suite**
   - Store anonymized sample invoices; run automated tests comparing expected JSON output vs. parser output.
   - Validate numeric reconciliation (line totals sum to invoice total) and date extraction.
2. **Canary deployment**
   - Enable new parser per supplier; compare metrics vs. legacy flow.
   - Provide “re-parse with new engine” button for historical invoices.
3. **Continuous improvement**
   - Instrument feedback loop: every manual override logged and offered as training example/template update.
   - Periodic re-eval of templates when supplier formats change; notify admins when confidence drops.

## 7. Optional Enhancements
- Dedicated OCR service (AWS Textract/Google Vision) for complex scans.
- Fine-tuned extraction model (LayoutLM, Donut) if LLM cost/latency becomes prohibitive.
- Automated variance workflows (e.g., auto-create tasks when invoice total exceeds PO by >5%).

---

This plan delivers a structured pipeline—from ingestion through AI parsing, matching, and reviewer experience—while adding instrumentation to keep accuracy improving over time.
