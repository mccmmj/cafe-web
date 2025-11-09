# Mock Purchase Order & Invoice Pair

This sample dataset illustrates how a purchase order, supplier invoice, OCR text, and AI-parsed payload can link together for workflow development.

## Files

- `data/purchase-orders/mock_purchase_order.json`  
  Source of truth for the internal purchase order (PO-2025-0101) including supplier, line items, and planned quantities.

- `data/purchase-orders/mock_invoice_raw.txt`  
  Simulated OCR output from the supplier’s PDF invoice. Use this when developing ingestion and parsing logic.

- `data/purchase-orders/mock_invoice_parsed.json`  
  Example AI/ML parse that maps invoice values back to inventory items, totals, and metadata.

- `data/purchase-orders/mock_invoice.pdf`  
  Generated invoice document (US Letter PDF) suitable for testing OCR pipelines.

## Automation Helpers

- `scripts/create-invoice-mock.js` fetches an existing purchase order from Supabase and generates the PO snapshot, invoice text, parsed JSON, and PDF in one command. Example:

  ```bash
  node scripts/create-invoice-mock.js --order PO-2025-0101 --shipping 25 --tax-rate 0.085
  ```

- `scripts/generate-mock-invoice-pdf.js` now accepts `--input`/`--output` so you can regenerate PDFs from any raw invoice text.

- `scripts/render_invoice_images.py` (requires `pdf2image`/`PyMuPDF`) converts the PDF to PNG/JPG for photo-based OCR scenarios:

  ```bash
  python scripts/render_invoice_images.py --input data/purchase-orders/PO-2025-0101_invoice.pdf --png ... --jpg ...
  ```

- To mock partial deliveries, re-run `create-invoice-mock.js` with adjusted quantities (e.g., change the PO items first or provide a separate PO snapshot) so the generated invoice reflects the partial receipt. This provides deterministic fixtures for reconciliation logic.

## Scenario Overview

| Attribute              | Value                          |
|------------------------|--------------------------------|
| Supplier               | Premium Coffee Roasters        |
| PO Number              | PO-2025-0101                   |
| Invoice Number         | INV-88271                      |
| Invoice Date           | 2025-01-16                     |
| Due Date               | 2025-02-15                     |
| Items Ordered          | Espresso beans, Vanilla syrup, Mocha sauce |
| Shipping Cost          | $35.00                         |
| Tax                    | $70.32                         |
| Total Due              | $897.32                        |

## Suggested Workflow

1. **PO Creation**  
   Developers can import `mock_purchase_order.json` into the database to seed a purchase order in `purchase_orders` + `purchase_order_items`.

2. **Invoice Upload**  
   Treat `mock_invoice_raw.txt` as the OCR layer. In production this would be the result of OCR (Tesseract, AWS Textract, etc.).

3. **AI Parsing**  
   Use `mock_invoice_parsed.json` as the expected output of an AI-assisted parser (LLM or rule-based). It includes:
   - Resolved `inventory_item_id` matches  
   - Normalized monetary values  
   - Metadata (shipping method, pointer to raw text)

4. **Reconciliation/Test Cases**
   - Verify totals vs PO, allow tolerances for tax/shipping differences.  
   - Demonstrate marking a PO line as received when the invoice matches or create exceptions when quantities differ.  
   - Attach invoice artifacts to the PO for auditing.

This mock data is intentionally simple yet realistic enough to support UI demos, API testing, and automated regression tests. Feel free to clone and adjust amounts, add partial deliveries, or introduce mismatches to exercise edge-case handling.***
