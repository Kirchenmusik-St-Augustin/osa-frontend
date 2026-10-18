/**
 * Deterministic UUID-shaped identifier for fixtures: the API identifies every
 * record by a UUID string, so numeric ids in mocks would contradict the types.
 */
export const testId = (n: number): string =>
  `0198a3c4-0000-7000-8000-${String(n).padStart(12, '0')}`
