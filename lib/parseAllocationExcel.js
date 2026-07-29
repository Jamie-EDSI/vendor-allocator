// Reads your real allocation workbook: one tab per location (e.g. "Bay City",
// "Columbus", "Houston", ...). On each tab, project codes are listed
// somewhere in a column with their percentage in the adjacent cell, e.g.:
//
//   57E07A   25%
//   57E06A   15%
//   ...
//
// Percentage can be entered either as 0.25 or as 25 (i.e. 25%) — both are
// handled. Tabs with no recognizable project codes (notes/instructions
// sheets, etc.) are ignored. Every tab that does contain project codes must
// have its percentages sum to 100% (within 0.01) or parsing fails with an
// error naming that tab.

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

// Invoice locations sometimes carry a parenthetical the workbook tab name
// doesn't, e.g. PDF "Waller (Hempstead)" vs. tab "Waller" — normalize both
// sides the same way so they match.
function normalizeLocationKey(name) {
  return name
    .toString()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  const matches = [];

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell === null || cell === undefined) continue;
      const code = cell.toString().trim().toUpperCase();
      if (!PROJECT_CODE_SET.has(code)) continue;

      const neighbor = row[i + 1] ?? row[i - 1];
      const parsed = parsePercentageValue(neighbor);
      if (parsed !== null) matches.push({ project: code, ...parsed });
      break; // one project code per row
    }
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

module.exports = { parseAllocationExcel, normalizeLocationKey, PROJECT_CODES };
