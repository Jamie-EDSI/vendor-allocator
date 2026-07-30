// Builds the "Allocation Summary" workbook: one tab per location, laid out
// exactly like the allocation pages at the back of the RingCentral invoice
// PDF (Ring Central / Date / Invoice # / Total Invoice, then a
// Percentage/Total table listing every project code — including the ones
// at 0% for that location, blank total, matching the PDF).

const XLSX = require("xlsx");
const { PROJECT_CODES, findAllocationRule } = require("./parseAllocationExcel");

function money(n) {
  return Number(n.toFixed(2));
}

// invoiceDate arrives as whatever RingCentral printed, e.g. "6/15/2026" —
// normalize to zero-padded MM/DD/YY.
function formatDateMMDDYY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  let [m, d, y] = parts;
  if (y.length === 4) y = y.slice(2);
  return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y.padStart(2, "0")}`;
}

function generateAllocationSummary({ invoiceNumber, invoiceDate, lines, distributedLocations, allocationRules }) {
  const workbook = XLSX.utils.book_new();
  const formattedDate = formatDateMMDDYY(invoiceDate);

  const linesByLocation = {};
  for (const line of lines) {
    if (!linesByLocation[line.location]) linesByLocation[line.location] = {};
    linesByLocation[line.location][line.project] = line;
  }

  for (const { location, grossAmount } of distributedLocations) {
    const rule = findAllocationRule(allocationRules, location);
    const pctByProject = {};
    if (rule) {
      for (const p of rule.projects) pctByProject[p.project] = p.percentage;
    }
    const locLines = linesByLocation[location] || {};

    const rows = [
      [`${location} Allocation`],
      ["Ring Central"],
      ["Date", formattedDate],
      ["Invoice #", `${invoiceNumber}-${location}`],
      ["Total Invoice", money(grossAmount)],
      [],
      ["", "Percentage", "Total"],
    ];

    for (const code of PROJECT_CODES) {
      const pct = pctByProject[code] || 0;
      const line = locLines[code];
      rows.push([code, pct, line ? money(line.amount) : ""]);
    }

    rows.push(["", 1, money(grossAmount)]);

    const sheet = XLSX.utils.aoa_to_sheet(rows);

    sheet["A1"].s = { font: { bold: true } };
    sheet["B5"].z = "$#,##0.00";
    const lastRow = rows.length; // 1-indexed row number of the final "100%" row
    for (let r = 8; r <= lastRow; r++) {
      const pctCell = sheet[`B${r}`];
      if (pctCell) pctCell.z = "0.##%";
      const totalCell = sheet[`C${r}`];
      if (totalCell && totalCell.t === "n") totalCell.z = "$#,##0.00";
    }

    const safeName = location.replace(/[\\/*?:[\]]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, sheet, safeName);
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellStyles: true });
}

module.exports = { generateAllocationSummary };
