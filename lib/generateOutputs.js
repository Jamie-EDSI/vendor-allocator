const XLSX = require("xlsx");

// Output 1: Allocation Workbook — one sheet per location, formatted like your
// existing Bay City / Columbus / Houston pages, plus a Summary sheet.
function buildAllocationWorkbook({ invoiceNumber, invoiceDate, vendor, lines }) {
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
