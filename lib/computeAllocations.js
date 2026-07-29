// Two-stage allocation math, matching EDSI's existing manual process:
//
// 1. Redistribute the unassigned/corporate amount (the "-None-" / bare
//    "EDSI" rows RingCentral doesn't tie to a location) across every
//    location, proportional to that location's share of the locations
//    subtotal:
//      locationGross = locationNet + (locationNet / locationsSubtotal) * unassigned
//
// 2. Split each location's grossed-up total by its stored project
//    percentages: projectAmount = locationGross * pct.
//
// locationGross is kept at full floating-point precision from stage 1 into
// stage 2 — it's rounded once for display (the "Total Invoice" / Entry
// Distribution figures) but the *unrounded* value is what each percentage
// is multiplied against. Rounding the gross itself before multiplying would
// round twice, which is enough to flip a genuine tie (e.g. a 25% split of
// the rounded $464.10 is exactly $116.025 — rounds to $116.03 — while the
// unrounded gross of $464.0959... splits to $116.024, correctly rounding
// down to $116.02, matching the source invoice).
//
// No rounding-drift reconciliation is applied on top of this: each amount
// (a location's gross, each of its project lines) is independently rounded
// to 2 decimals, same as EDSI's existing spreadsheets — which means, same
// as those spreadsheets, a location's lines can be a penny off from its
// displayed gross, and grosses a penny or two off from the invoice total.

const { normalizeLocationKey } = require("./parseAllocationExcel");

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeAllocations(locations, unassignedAmount, locationsSubtotal, allocationRules) {
  const hasUnassigned = unassignedAmount > 0 && locationsSubtotal > 0;

  const unroundedGrossByLocation = new Map();
  for (const l of locations) {
    const share = hasUnassigned ? unassignedAmount * (l.amount / locationsSubtotal) : 0;
    unroundedGrossByLocation.set(l.location, l.amount + share);
  }

  const distributedLocations = locations.map((l) => {
    const grossAmount = round2(unroundedGrossByLocation.get(l.location));
    return {
      location: l.location,
      netAmount: l.amount,
      grossAmount,
      entryShare: round2(grossAmount - l.amount),
      percentOfNet: locationsSubtotal ? l.amount / locationsSubtotal : 0,
    };
  });

  const results = [];
  const warnings = [];

  for (const d of distributedLocations) {
    const key = normalizeLocationKey(d.location);
    const rule = allocationRules[key];

    if (!rule || rule.projects.length === 0) {
      warnings.push(
        `No allocation percentages found for "${d.location}" — skipped. Add it to the allocation workbook.`
      );
      continue;
    }

    const pctSum = rule.projects.reduce((s, p) => s + p.percentage, 0);
    if (Math.abs(pctSum - 1) > 0.01) {
      warnings.push(
        `"${d.location}" percentages sum to ${(pctSum * 100).toFixed(2)}%, not 100% — check the allocation workbook.`
      );
    }

    const unroundedGross = unroundedGrossByLocation.get(d.location);
    const lines = rule.projects
      .filter((p) => p.percentage > 0)
      .map((p) => ({
        location: d.location,
        project: p.project,
        percentage: p.percentage,
        amount: round2(unroundedGross * p.percentage),
      }));

    results.push(...lines);
  }

  return { lines: results, warnings, distributedLocations };
}

module.exports = { computeAllocations };
