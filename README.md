# Vendor Invoice Allocator (v1 — RingCentral)

Turns a RingCentral invoice PDF into the two things you currently build by
hand each month:

1. **Allocation Workbook (.xlsx)** — each location's invoice amount split
   across project codes, same shape as your existing Bay City/Houston/etc.
   pages.
2. **AP Entry File (.csv)** — flat Vendor/Invoice/Location/Project/Amount
   rows, ready to import.
3. **Allocation PDF** — a cover page listing every location's total,
   followed by one page per location formatted like the "Bay City
   Allocation" pages at the back of your original invoice (Date, Invoice #,
   Total, then a Project/Percentage/Amount table).

Tested end-to-end against your June 2026 invoice — the allocated total
reconciles exactly to $4,388.11 (the $5,416.09 invoice total minus the
$1,027.98 of "-None-"/corporate "EDSI" charges that aren't tied to a
location, same as your current process excludes).

---

## 1. What you need before you start

- A **free GitHub account** (github.com) — this is where the code lives so
  Vercel can deploy it.
- A **free Vercel account** (vercel.com) — sign up with "Continue with
  GitHub" so the two are linked automatically.

No coding required for either of these steps — just account creation.

## 2. Get the code onto GitHub

1. Go to github.com, click the **+** in the top right → **New repository**.
2. Name it `vendor-allocator`, leave it Private, click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Unzip `vendor-allocator.zip` (the file I gave you) on your computer, then
   drag the *contents* of that folder (not the folder itself) into the
   GitHub upload box.
5. Scroll down, click **Commit changes**.

## 3. Deploy to Vercel

1. Go to vercel.com, click **Add New** → **Project**.
2. Find `vendor-allocator` in the list of your GitHub repos and click
   **Import**.
3. Leave every setting as the default — Vercel auto-detects this is a
   Next.js app.
4. Click **Deploy**. It takes about a minute.
5. When it finishes, click the preview thumbnail — you'll land on the live
   app at a URL like `vendor-allocator-yourname.vercel.app`.

That's it. From now on, any time you push a change to the GitHub repo,
Vercel automatically redeploys it — no manual steps.

## 4. Using the app

1. Upload the invoice PDF.
2. (Optional) Upload your allocation percentage workbook — if you skip
   this, it uses the current known percentages for all 9 locations, built
   into the app as a fallback. Use **Download a pre-filled template** to
   get a workbook already in the right format (Location / Project /
   Percentage columns) so you're not retyping anything.
3. Click **Process Invoice**.
4. Review the table and the total-reconciliation line at the top. If a
   location's percentages don't add to 100%, or a location has no
   percentages on file, you'll see a warning — nothing downloads silently
   wrong.
5. Download the two files.

## 5. If something breaks

- **"Couldn't find a Summary by Cost Center section"** — this parser is
  built specifically for RingCentral's invoice layout. If RingCentral
  changes their PDF format, or you try a different vendor's PDF, this will
  fail — expected for v1. The fix lives in
  `lib/parseInvoicePdf.js`, in the regex on the `extractCostCenters`
  function — that's the one part of the app tied to RingCentral's exact
  layout.
- **A location shows a warning about missing percentages** — add that
  location to your allocation workbook and re-upload.

## 6. Extending this to other vendors later

This is where the "vendor allocation engine" idea from the CFO's memo comes
in. Right now `lib/parseInvoicePdf.js` is RingCentral-specific. To add a
new vendor (Verizon, AT&T, etc.), you'd add a new parser file for that
vendor's PDF layout (e.g. `lib/parseVerizonPdf.js`) and a dropdown on the
front page to pick which parser to use — the allocation math, workbook
generation, and CSV export in `lib/computeAllocations.js` and
`lib/generateOutputs.js` are already vendor-agnostic and would be reused
as-is.

## Project structure

```
app/
  page.jsx              — the upload/review/download screen
  layout.js
  api/process/route.js  — handles upload, runs the pipeline, returns results
  api/template/route.js — serves the pre-filled percentage template
lib/
  parseInvoicePdf.js       — RingCentral-specific: pulls locations+amounts from the PDF
  parseAllocationExcel.js  — reads your uploaded percentage workbook
  computeAllocations.js    — the actual math + rounding reconciliation
  generateOutputs.js       — builds the .xlsx and .csv files
  seedAllocationRules.js   — fallback percentages if no workbook is uploaded
```
