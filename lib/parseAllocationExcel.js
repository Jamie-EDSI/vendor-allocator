// Reads your real allocation workbook: one tab per location (e.g. "Bay City",
// "Southwest-Houston", "Waller-Hempstead", ...). On each tab, find the header
// row with a "Percentage" cell and a "Total" cell (case-insensitive); project
// codes live in column A below that row, and each code's percentage is read
// from the Percentage column of its row (the Total column holds dollar
// amounts and is ignored). A blank percentage cell means 0%.
//
// Percentage can be entered either as 0.25 or as 25 (i.e. 25%) — both are
// handled. Tabs with no "Percentage"/"Total" header, or no project codes
// below it (notes/instructions sheets, etc.), are ignored. Every tab that
// does contain project codes must have its percentages sum to 100% (within
// 0.01) or parsing fails with an error naming that tab.

const XLSX = require("xlsx");

const PROJECT_CODES = [
  "57E07A",
  "57E06A",
  "57E05A",
  "57E10A",
  "57E09A",
  "57E08A",
  "57E04A",
  "57E03A",
  "57E02A",
];

const PROJECT_CODE_SET = new Set(PROJECT_CODES);

// Invoice locations and workbook tab names spell things differently, e.g.
// PDF "Waller (Hempstead)" vs. tab "Waller-Hempstead", or PDF "Houston" vs.
// tab "Southwest-Houston" — normalize both sides the same way and match
// if either contains the other (see findAllocationRule).
function normalizeLocationKey(name) {
  return name
    .toString()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Looks up a location's allocation rule allowing partial matches in either
// direction, so a tab name that's a superset ("Southwest-Houston") or
// subset of the invoice's location name still matches.
function findAllocationRule(rules, locationName) {
  const normLoc = normalizeLocationKey(locationName);
  if (rules[normLoc]) return rules[normLoc];
  for (const [key, rule] of Object.entries(rules)) {
    if (key.includes(normLoc) || normLoc.includes(key)) return rule;
  }
  return null;
}

function isHeaderLabel(cell, label) {
  return typeof cell === "string" && cell.trim().toLowerCase() === label;
}

// Finds the row containing both a "Percentage" and a "Total" header cell,
// returning that row's index and the column index of "Percentage".
function findHeaderRow(rows) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let pctCol = -1;
    let hasTotal = false;
    for (let c = 0; c < row.length; c++) {
      if (isHeaderLabel(row[c], "percentage")) pctCol = c;
      if (isHeaderLabel(row[c], "total")) hasTotal = true;
    }
    if (pctCol !== -1 && hasTotal) return { headerRowIndex: r, pctCol };
  }
  return null;
}

// A cell written as "25%" is unambiguous. A plain number is not: "25" means
// 25%, but "1" is genuinely ambiguous between 1.0 (=100%, if the column is
// already fraction-scaled) and 1% (if the column is whole-percent-scaled).
// So plain numbers are returned unscaled here, and parseLocationSheet infers
// the scale for the whole sheet at once from context (see below) rather than
// guessing cell-by-cell.
function parsePercentageValue(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "string" && raw.includes("%")) {
    const n = parseFloat(raw.replace("%", "").trim());
    return Number.isNaN(n) ? null : { resolved: n / 100 };
  }
  const n = typeof raw === "string" ? parseFloat(raw.trim()) : raw;
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return { raw: n };
}

function parseLocationSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const header = findHeaderRow(rows);
  if (!header) return []; // no Percentage/Total header — not a location tab

  const matches = [];
  for (let r = header.headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const codeCell = row[0];
    if (codeCell === null || codeCell === undefined) continue;
    const code = codeCell.toString().trim().toUpperCase();
    if (!PROJECT_CODE_SET.has(code)) continue;

    const pctCell = row[header.pctCol];
    const parsed = parsePercentageValue(pctCell);
    matches.push({ project: code, ...(parsed || { resolved: 0 }) });
  }

  if (matches.length === 0) return [];

  // Unscaled plain numbers only make sense as a whole sheet: either they're
  // all fractions (sum ~1) or all whole percents (sum ~100). Infer which
  // from their raw total rather than per-cell, so a lone "1" (1%) among
  // "25", "15", etc. doesn't get mistaken for "1" (=100%).
  const unscaled = matches.filter((m) => m.raw !== undefined);
  const rawSum = unscaled.reduce((s, m) => s + m.raw, 0);
  const scale = rawSum > 1.5 ? 100 : 1;

  return matches.map((m) => ({
    project: m.project,
    percentage: m.resolved !== undefined ? m.resolved : m.raw / scale,
  }));
}

function parseAllocationExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  if (workbook.SheetNames.length === 0) {
    throw new Error("The allocation workbook appears to be empty.");
  }

  const rules = {}; // { normalizedLocationKey: { displayName, projects: [{ project, percentage }] } }

  for (const sheetName of workbook.SheetNames) {
    const projects = parseLocationSheet(workbook.Sheets[sheetName]);
    if (projects.length === 0) continue; // not a location tab — skip silently

    const sum = projects.reduce((s, p) => s + p.percentage, 0);
    if (Math.abs(sum - 1) > 0.01) {
      throw new Error(
        `"${sheetName}" tab percentages sum to ${(sum * 100).toFixed(2)}%, not 100% — fix the allocation workbook before re-uploading.`
      );
    }

    rules[normalizeLocationKey(sheetName)] = {
      displayName: sheetName,
      projects: projects.filter((p) => p.percentage > 0),
    };
  }

  if (Object.keys(rules).length === 0) {
    throw new Error(
      "No location tabs with recognizable project codes were found in the allocation workbook."
    );
  }

  return rules;
}

module.exports = { parseAllocationExcel, normalizeLocationKey, findAllocationRule, PROJECT_CODES };
