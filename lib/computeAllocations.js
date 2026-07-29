// Multiplies each location's invoice amount by its stored percentages.
// Because percentages and dollars both round, a naive multiply can leave the
// location's line items off by a penny or two from its invoice total. We fix
// that by dumping any rounding remainder onto the largest project line for
// that location, so every location's allocated total reconciles exactly to
// the dollar amount RingCentral billed for it.

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computeAllocations(costCenterLocations, allocationRules) {
  const results = [];
  const warnings = [];

  for (const { location, amount } of costCenterLocations) {
    const key = location.toLowerCase();
    const rule = allocationRules[key];

    if (!rule || rule.projects.length === 0) {
      warnings.push(
        `No allocation percentages found for "${location}" — skipped. Add it to the allocation workbook.`
      );
      continue;
    }

    const pctSum = rule.projects.reduce((s, p) => s + p.percentage, 0);
    if (Math.abs(pctSum - 1) > 0.005) {
      warnings.push(
        `"${location}" percentages sum to ${(pctSum * 100).toFixed(1)}%, not 100% — check the allocation workbook.`
      );
    }

    const lines = rule.projects
      .filter((p) => p.percentage > 0)
      .map((p) => ({
        location,
        project: p.project,
        percentage: p.percentage,
        amount: round2(amount * p.percentage),
      }));

    // Reconcile rounding drift to the largest line
    const allocatedSum = round2(lines.reduce((s, l) => s + l.amount, 0));
    const drift = round2(amount - allocatedSum);
    if (drift !== 0 && lines.length > 0) {
      const largest = lines.reduce((a, b) => (b.amount > a.amount ? b : a));
      largest.amount = round2(largest.amount + drift);
    }

    results.push(...lines);
  }

  return { lines: results, warnings };
}

module.exports = { computeAllocations };
