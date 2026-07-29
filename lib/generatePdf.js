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

async function generateAllocationPdf({ vendor, invoiceNumber, invoiceDate, lines }) {
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
