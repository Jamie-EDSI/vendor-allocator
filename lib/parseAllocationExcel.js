// Reads your allocation percentage workbook. Expected shape: one flat sheet
// (any sheet name — we use the first one) with three columns, header row required:
//
//   Location        | Project  | Percentage
//   Bay City        | 57E07A   | 0.25
//   Bay City        | 57E06A   | 0.15
//   ...
//
// Percentage can be entered either as 0.25 or as 25 (i.e. 25%) — both are handled.
// A ready-made template with your current percentages is available from the
// "Download template" button in the app.

const XLSX = require("xlsx");

function parseAllocationExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rows.length === 0) {
    throw new Error("The allocation workbook appears to be empty.");
  }

  const rules = {}; // { locationKey: [{ project, percentage }] }

  for (const row of rows) {
    const location = (row.Location || row.location || "").toString().trim();
    const project = (row.Project || row.project || "").toString().trim();
    let pct = row.Percentage ?? row.percentage ?? row["%"];

    if (!location || !project || pct === null || pct === undefined) continue;

    pct = typeof pct === "string" ? parseFloat(pct.replace("%", "")) : pct;
    if (pct > 1) pct = pct / 100; // treat "25" as 25%

    const key = location.toLowerCase();
    if (!rules[key]) rules[key] = { displayName: location, projects: [] };
    rules[key].projects.push({ project, percentage: pct });
  }

  return rules;
}

module.exports = { parseAllocationExcel };
