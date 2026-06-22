// Shared "lookalike" comparison used by R13 (lookalike-mint) and R25 (lookalike-address): two base58
// addresses that share the first-6 AND last-6 chars (exactly what a truncated wallet UI shows) but
// are not byte-identical are a likely spoof / address-poisoning attempt.

export function isLookalike(addr: string, reference: string): boolean {
  if (addr === reference || addr.length < 12 || reference.length < 12) return false;
  return addr.slice(0, 6) === reference.slice(0, 6) && addr.slice(-6) === reference.slice(-6);
}
