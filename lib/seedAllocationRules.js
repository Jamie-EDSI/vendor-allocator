// These are the percentages read off the allocation pages at the back of the
// June 2026 RingCentral invoice. They're only used to pre-fill the downloadable
// template — the app always uses whatever workbook you actually upload.

const seedAllocationRules = [
  {
    location: "Bay City",
    projects: [
      { project: "57E07A", percentage: 0.25 },
      { project: "57E06A", percentage: 0.15 },
      { project: "57E05A", percentage: 0.20 },
      { project: "57E10A", percentage: 0.05 },
      { project: "57E09A", percentage: 0.03 },
      { project: "57E08A", percentage: 0.13 },
      { project: "57E04A", percentage: 0.16 },
      { project: "57E03A", percentage: 0.03 },
    ],
  },
  {
    location: "Columbus",
    projects: [
      { project: "57E07A", percentage: 0.61 },
      { project: "57E06A", percentage: 0.39 },
    ],
  },
  {
    location: "Houston",
    projects: [
      { project: "57E07A", percentage: 0.07 },
      { project: "57E06A", percentage: 0.05 },
      { project: "57E05A", percentage: 0.21 },
      { project: "57E10A", percentage: 0.04 },
      { project: "57E09A", percentage: 0.04 },
      { project: "57E08A", percentage: 0.18 },
      { project: "57E04A", percentage: 0.32 },
      { project: "57E03A", percentage: 0.08 },
      { project: "57E02A", percentage: 0.01 },
    ],
  },
  {
    location: "Katy",
    projects: [
      { project: "57E07A", percentage: 0.30 },
      { project: "57E06A", percentage: 0.15 },
      { project: "57E05A", percentage: 0.20 },
      { project: "57E10A", percentage: 0.05 },
      { project: "57E09A", percentage: 0.03 },
      { project: "57E08A", percentage: 0.06 },
      { project: "57E04A", percentage: 0.18 },
      { project: "57E03A", percentage: 0.03 },
    ],
  },
  {
    location: "Missouri City",
    projects: [
      { project: "57E07A", percentage: 0.27 },
      { project: "57E06A", percentage: 0.16 },
      { project: "57E05A", percentage: 0.21 },
      { project: "57E10A", percentage: 0.05 },
      { project: "57E09A", percentage: 0.03 },
      { project: "57E08A", percentage: 0.14 },
      { project: "57E04A", percentage: 0.11 },
      { project: "57E03A", percentage: 0.03 },
    ],
  },
  {
    location: "Rosenberg",
    projects: [
      { project: "57E07A", percentage: 0.07 },
      { project: "57E06A", percentage: 0.04 },
      { project: "57E05A", percentage: 0.15 },
      { project: "57E10A", percentage: 0.04 },
      { project: "57E09A", percentage: 0.04 },
      { project: "57E08A", percentage: 0.20 },
      { project: "57E04A", percentage: 0.35 },
      { project: "57E03A", percentage: 0.10 },
      { project: "57E02A", percentage: 0.01 },
    ],
  },
  {
    location: "Sealy",
    projects: [
      { project: "57E07A", percentage: 0.61 },
      { project: "57E06A", percentage: 0.39 },
    ],
  },
  {
    location: "Waller (Hempstead)",
    projects: [
      { project: "57E07A", percentage: 0.61 },
      { project: "57E06A", percentage: 0.39 },
    ],
  },
  {
    location: "Wharton",
    projects: [
      { project: "57E07A", percentage: 0.61 },
      { project: "57E06A", percentage: 0.39 },
    ],
  },
];

module.exports = { seedAllocationRules };
