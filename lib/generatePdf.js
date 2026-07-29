// Builds a multi-page PDF: a cover/summary page listing every location's
// total, followed by one page per location formatted like the "Bay City
// Allocation" / "Columbus Allocation" pages at the back of your original
// RingCentral invoice (Vendor, Date, Invoice #, Total Invoice, then a
// Project / Percentage / Total table).

const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 54;

function money(n) {
  return `$${n.toFixed(2)}`;
}

async function generateAllocationPdf({
  vendor,
  invoiceNumber,
  invoiceDate,
  lines,
  distributedLocations,
  unassignedAmount,
  invoiceGrandTotal,
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const byLocation = {};
  for (const line of lines) {
    if (!byLocation[line.location]) byLocation[line.location] = [];
    byLocation[line.location].push(line);
  }

  // ---- Cover / summary page ----
  {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText(`${vendor} Allocation Summary`, { x: MARGIN, y, size: 18, font: bold });
    y -= 28;
    page.drawText(`Invoice #: ${invoiceNumber}`, { x: MARGIN, y, size: 11, font });
    y -= 16;
    page.drawText(`Date: ${invoiceDate}`, { x: MARGIN, y, size: 11, font });
    y -= 30;

    page.drawText("Location", { x: MARGIN, y, size: 11, font: bold });
    page.drawText("Total Allocated", { x: PAGE_WIDTH - MARGIN - 120, y, size: 11, font: bold });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 16;

    let grandTotal = 0;
    for (const [location, locLines] of Object.entries(byLocation)) {
      const total = locLines.reduce((s, l) => s + l.amount, 0);
      grandTotal += total;
      page.drawText(location, { x: MARGIN, y, size: 10.5, font });
      page.drawText(money(total), { x: PAGE_WIDTH - MARGIN - 120, y, size: 10.5, font });
      y -= 16;
      if (y < MARGIN + 40) {
        y = PAGE_HEIGHT - MARGIN; // simple overflow guard; 9 locations fits on one page
      }
    }

    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 16;
    page.drawText("Total", { x: MARGIN, y, size: 11, font: bold });
    page.drawText(money(grandTotal), { x: PAGE_WIDTH - MARGIN - 120, y, size: 11, font: bold });
  }

  // ---- Entry distribution page — how the unassigned/corporate amount got
  // spread across locations before project splits, same shape as the
  // "Ring Central - TX" worked example ----
  if (distributedLocations && distributedLocations.length > 0 && unassignedAmount > 0.005) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    page.drawText(`${vendor} - TX`, { x: MARGIN, y, size: 16, font: bold });
    y -= 22;
    page.drawText(`Entry (unassigned)`, { x: MARGIN, y, size: 10.5, font });
    page.drawText(money(unassignedAmount), { x: MARGIN + 140, y, size: 10.5, font, color: rgb(0.7, 0.5, 0) });
    y -= 26;

    const col = [MARGIN, MARGIN + 140, MARGIN + 230, MARGIN + 320, PAGE_WIDTH - MARGIN - 60];
    page.drawText("Location", { x: col[0], y, size: 10.5, font: bold });
    page.drawText("Total", { x: col[1], y, size: 10.5, font: bold });
    page.drawText("Entry", { x: col[2], y, size: 10.5, font: bold });
    page.drawText("Net", { x: col[3], y, size: 10.5, font: bold });
    page.drawText("% of Net", { x: col[4], y, size: 10.5, font: bold });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
    y -= 16;

    let sumTotal = 0, sumEntry = 0, sumNet = 0;
    for (const d of distributedLocations) {
      sumTotal += d.grossAmount;
      sumEntry += d.entryShare;
      sumNet += d.netAmount;
      page.drawText(d.location, { x: col[0], y, size: 10, font });
      page.drawText(money(d.grossAmount), { x: col[1], y, size: 10, font });
      page.drawText(money(d.entryShare), { x: col[2], y, size: 10, font });
      page.drawText(money(d.netAmount), { x: col[3], y, size: 10, font });
      page.drawText(`${(d.percentOfNet * 100).toFixed(2)}%`, { x: col[4], y, size: 10, font });
      y -= 16;
    }

    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
    y -= 16;
    page.drawText("Total", { x: col[0], y, size: 10.5, font: bold });
    page.drawText(money(sumTotal), { x: col[1], y, size: 10.5, font: bold });
    page.drawText(money(sumEntry), { x: col[2], y, size: 10.5, font: bold });
    page.drawText(money(sumNet), { x: col[3], y, size: 10.5, font: bold });
    page.drawText("100.00%", { x: col[4], y, size: 10.5, font: bold });
  }

  // ---- One page per location ----
  for (const [location, locLines] of Object.entries(byLocation)) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    const total = locLines.reduce((s, l) => s + l.amount, 0);

    page.drawText(`${location} Allocation`, { x: MARGIN, y, size: 16, font: bold });
    y -= 26;

    page.drawText(vendor, { x: MARGIN, y, size: 11, font: bold });
    y -= 16;
    page.drawText(`Date: ${invoiceDate}`, { x: MARGIN, y, size: 10.5, font });
    y -= 14;
    page.drawText(`Invoice #: ${invoiceNumber}-${location}`, { x: MARGIN, y, size: 10.5, font });
    y -= 14;
    page.drawText(`Total Invoice: ${money(total)}`, { x: MARGIN, y, size: 10.5, font });
    y -= 26;

    // Table header
    page.drawText("Project", { x: MARGIN, y, size: 10.5, font: bold });
    page.drawText("Percentage", { x: MARGIN + 200, y, size: 10.5, font: bold });
    page.drawText("Amount", { x: PAGE_WIDTH - MARGIN - 80, y, size: 10.5, font: bold });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 16;

    for (const line of locLines) {
      page.drawText(line.project, { x: MARGIN, y, size: 10, font });
      page.drawText(`${(line.percentage * 100).toFixed(0)}%`, { x: MARGIN + 200, y, size: 10, font });
      page.drawText(money(line.amount), { x: PAGE_WIDTH - MARGIN - 80, y, size: 10, font });
      y -= 16;
    }

    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 16;
    page.drawText("100%", { x: MARGIN + 200, y, size: 10.5, font: bold });
    page.drawText(money(total), { x: PAGE_WIDTH - MARGIN - 80, y, size: 10.5, font: bold });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

module.exports = { generateAllocationPdf };
