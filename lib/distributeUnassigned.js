// RingCentral (and EDSI Finance's manual process) doesn't leave the
// "-None-" / bare "EDSI" corporate charges unallocated — it spreads that
// amount across every location, proportional to each location's share of
// the locations subtotal, THEN splits each location's grossed-up total by
// project percentage. This file reproduces that first step.
//
// Formula (verified against the June 2026 invoice's own worked example):
//   entryShare(location) = unassignedAmount * (locationNet / locationsSubtotal)
//   grossAmount(location) = locationNet + entryShare(location)

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function distributeUnassigned(locations, unassignedAmount, locationsSubtotal) {
  if (!unassignedAmount || unassignedAmount <= 0 || !locationsSubtotal) {
    // Nothing to redistribute — gross amount equals net amount
    return locations.map((l) => ({
      location: l.location,
      netAmount: l.amount,
      entryShare: 0,
      grossAmount: l.amount,
      percentOfNet: locationsSubtotal ? l.amount / locationsSubtotal : 0,
    }));
  }

  const results = locations.map((l) => {
    const share = round2(unassignedAmount * (l.amount / locationsSubtotal));
    return {
      location: l.location,
      netAmount: l.amount,
      entryShare: share,
      grossAmount: round2(l.amount + share),
      percentOfNet: l.amount / locationsSubtotal,
    };
  });

  // Reconcile rounding drift (entry shares should sum to unassignedAmount
  // exactly) onto the largest share
  const shareSum = round2(results.reduce((s, r) => s + r.entryShare, 0));
  const drift = round2(unassignedAmount - shareSum);
  if (drift !== 0 && results.length > 0) {
    const largest = results.reduce((a, b) => (b.entryShare > a.entryShare ? b : a));
    largest.entryShare = round2(largest.entryShare + drift);
    largest.grossAmount = round2(largest.netAmount + largest.entryShare);
  }

  return results;
}

module.exports = { distributeUnassigned };
