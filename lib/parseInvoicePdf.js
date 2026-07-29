// Parses a RingCentral invoice PDF and pulls the "Summary by Cost Center" table.
// We deliberately only trust lines shaped like "EDSI>LocationName  $123.45" —
// the "- None -" and bare "EDSI" rows are corporate/unassigned charges that
// don't get split across project codes, so we skip them on purpose.

// Importing the internal module (not the package's index.js) sidesteps a
// known pdf-parse bug where its debug-mode test snippet runs during Next.js's
// build-time page-data collection and crashes looking for a fixture file.
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

function extractInvoiceMeta(text) {
  const invoiceNoMatch = text.match(/Invoice No\.?:?\s*([A-Za-z0-9_]+)/);
  const invoiceDateMatch = text.match(/Invoice Date:?\s*([\d/]+)/);
  const totalMatch = text.match(/Invoice Amount to Pay:?\s*\$?([\d,]+\.\d{2})/);
  return {
    invoiceNumber: invoiceNoMatch ? invoiceNoMatch[1] : null,
    invoiceDate: invoiceDateMatch ? invoiceDateMatch[1] : null,
    invoiceTotal: totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : null,
  };
}

function extractCostCenters(text) {
  // Grab everything between "Summary by Cost Center" and the next "Total"
  const sectionMatch = text.match(
    /Summary by Cost Center([\s\S]*?)Total\s*\$?([\d,]+\.\d{2})/
  );

  if (!sectionMatch) {
    throw new Error(
      "Couldn't find a 'Summary by Cost Center' section in this PDF. This parser is built for RingCentral invoices — if the layout changed, the regex in lib/parseInvoicePdf.js needs updating."
    );
  }

  const section = sectionMatch[1];
  const grandTotal = parseFloat(sectionMatch[2].replace(/,/g, ""));

  const locationLineRegex = /EDSI>([A-Za-z0-9() .]+?)\s*\$?([\d,]+\.\d{2})/g;
  const locations = [];
  let m;
  while ((m = locationLineRegex.exec(section)) !== null) {
    locations.push({
      location: m[1].trim(),
      amount: parseFloat(m[2].replace(/,/g, "")),
    });
  }

  if (locations.length === 0) {
    throw new Error(
      "Found the Summary by Cost Center section but no EDSI>Location rows inside it. Double check the PDF matches the expected RingCentral format."
    );
  }

  const locationsSubtotal = round2Sum(locations.map((l) => l.amount));
  const unassignedAmount = round2Sum([grandTotal, -locationsSubtotal]);

  return { locations, grandTotal, locationsSubtotal, unassignedAmount };
}

function round2Sum(nums) {
  return Math.round(nums.reduce((s, n) => s + n, 0) * 100) / 100;
}

async function parseInvoicePdf(buffer) {
  const { text } = await pdfParse(buffer);
  const meta = extractInvoiceMeta(text);
  const { locations, grandTotal, locationsSubtotal, unassignedAmount } = extractCostCenters(text);
  return {
    ...meta,
    locations,
    invoiceGrandTotal: grandTotal,
    locationsSubtotal,
    unassignedAmount, // e.g. "-None-" and bare "EDSI" rows — corporate charges not tied to a location, never allocated to project codes
  };
}

module.exports = { parseInvoicePdf, extractCostCenters, extractInvoiceMeta };
