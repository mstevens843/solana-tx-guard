// Offline blocklist of known drainer program ids and destination addresses. Ships embedded so a
// host with no network still catches the most common shared drainer infrastructure. Populated
// from incident reports (kept current as part of releases). Starts empty; see CONTRIBUTING.

export const DRAINER_PROGRAM_DENYLIST: ReadonlySet<string> = new Set<string>([
  // e.g. "<known-drainer-program-id>",
]);

export const DRAINER_ADDRESS_DENYLIST: ReadonlySet<string> = new Set<string>([
  // e.g. "<known-drainer-destination>",
]);

/** Token-2022 mints with known-malicious extensions (permanent-delegate / hook honeypots). */
export const MALICIOUS_MINT_DENYLIST: ReadonlySet<string> = new Set<string>([]);
