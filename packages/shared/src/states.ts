export const AUSTRALIAN_STATES = [
  "nsw",
  "qld",
  "vic",
  "wa",
  "sa",
  "tas",
  "act",
  "nt",
] as const;
export type AustralianState = (typeof AUSTRALIAN_STATES)[number];
