const XLSX = require("xlsx");

// Output 1: Allocation Workbook — a cost-center/entry summary sheet (matching
// the "Ring Central - TX" table style), one sheet per location, and an
// overall Summary sheet.
function buildAllocationWorkbook({
  invoiceNumber,
  invoiceDate,
  vendor,
  lines,
  distributedLocations,
  unassignedAmount,
  invoiceGrandTotal,
}) {
  const workbook = XLSX.utils.book_new();

  const byLocation = {};
  for (const line of lines) {
    if (!byLocation[line.location]) byLocation[line.location] = [];
    byLocation[line.location].push(line);
  }

  // Summary sheet first
  const summaryRows = [["Vendor", vendor], ["Invoice #", invoiceNumber], ["Invoice Date", invoiceDate], [], ["Location", "Total Allocated"]];
  for (const [location, locLines] of Object.entries(byLocation)) {
    const total = locLines.reduce((s, l) => s + l.amount, 0);
    summaryRows.push([location, Number(total.toFixed(2))]);
  }
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Cost-center / entry-distribution sheet, matching your "Ring Central - TX"
  // worked example: Location | Total (net + entry share) | Entry | Net | %
  if (distributedLocations && distributedLocations.length > 0) {
    const rows = [
      [`${vendor} - Entry Distribution`],
      [],
      ["", "Entry", Number((unassignedAmount || 0).toFixed(2))],
      ["Location", "Total", "Entry Share", "Net", "% of Net"],
    ];
    for (const d of distributedLocations) {
      rows.push([
        d.location,
        d.grossAmount,
        d.entryShare,
        d.netAmount,
        `${(d.percentOfNet * 100).toFixed(2)}%`,
      ]);
    }
    const grossTotal = distributedLocations.reduce((s, d) => s + d.grossAmount, 0);
    const netTotal = distributedLocations.reduce((s, d) => s + d.netAmount, 0);
    rows.push([
      "",
      Number(grossTotal.toFixed(2)),
      Number((unassignedAmount || 0).toFixed(2)),
      Number(netTotal.toFixed(2)),
      "100.00%",
    ]);
    const entrySheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, entrySheet, "Entry Distribution");
  }

  // One sheet per location
  for (const [location, locLines] of Object.entries(byLocation)) {
    const total = locLines.reduce((s, l) => s + l.amount, 0);
    const rows = [
      [`${location} Allocation`],
      ["Vendor", vendor],
      ["Invoice #", invoiceNumber === "" ? invoiceNumber : `${invoiceNumber}-${location}`],
      ["Invoice Total", Number(total.toFixed(2))],
      [],
      ["Project", "Percentage", "Amount"],
      ...locLines.map((l) => [l.project, `${(l.percentage * 100).toFixed(0)}%`, l.amount]),
      ["", "100%", Number(total.toFixed(2))],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const safeName = location.replace(/[\\/*?:[\]]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, sheet, safeName);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

// Output 2: AP Entry File — flat import-ready CSV.
function buildApEntryCsv({ invoiceNumber, vendor, lines }) {
  const header = "Vendor,Invoice,Location,Project,Amount";
  const rows = lines.map(
    (l) => `${vendor},${invoiceNumber},${l.location},${l.project},${l.amount.toFixed(2)}`
  );
  return [header, ...rows].join("\n");
}

// A ready-to-fill allocation-percentage template, pre-loaded with the current
// EDSI location/project percentages so there's nothing to re-type for month 1.
function buildAllocationTemplate(seedRules) {
  const rows = [["Location", "Project", "Percentage"]];
  for (const { location, projects } of seedRules) {
    for (const p of projects) {
      rows.push([location, p.project, p.percentage]);
    }
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Allocation Rules");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = { buildAllocationWorkbook, buildApEntryCsv, buildAllocationTemplate };
