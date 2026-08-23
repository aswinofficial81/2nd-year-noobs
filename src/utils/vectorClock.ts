import type { VectorClock, VectorClockLike, CausalOrder, CRDTOperation } from '../types/index.js';

/**
 * Normalizes a VectorClockLike into a standard Map<string, number>.
 */
export function toVectorClockMap(clock: VectorClockLike): Map<string, number> {
  if (clock instanceof Map) {
    return new Map(clock);
  }
  const map = new Map<string, number>();
  if (clock && typeof clock === 'object') {
    for (const [peer, val] of Object.entries(clock)) {
      if (typeof val === 'number' && Number.isFinite(val)) {
        map.set(peer, val);
      }
    }
  }
  return map;
}

/**
 * Compares two vector clocks to determine their causal relationship:
 * - 'equal': Both clocks have identical logical counters for all peers.
 * - 'before': Clock A strictly happened before Clock B (A <= B and A != B).
 * - 'after': Clock A strictly happened after Clock B (A >= B and A != B).
 * - 'concurrent': Neither clock dominates the other (concurrent independent updates).
 */
export function compareVectorClocks(
  clockA: VectorClockLike,
  clockB: VectorClockLike,
): CausalOrder {
  const mapA = toVectorClockMap(clockA);
  const mapB = toVectorClockMap(clockB);

  const allPeers = new Set<string>([...mapA.keys(), ...mapB.keys()]);

  let hasLess = false;
  let hasGreater = false;

  for (const peer of allPeers) {
    const valA = mapA.get(peer) ?? 0;
    const valB = mapB.get(peer) ?? 0;

    if (valA < valB) {
      hasLess = true;
    } else if (valA > valB) {
      hasGreater = true;
    }
  }

  if (hasLess && hasGreater) {
    return 'concurrent';
  }
  if (hasLess && !hasGreater) {
    return 'before';
  }
  if (!hasLess && hasGreater) {
    return 'after';
  }
  return 'equal';
}

/**
 * Merges two vector clocks by taking the maximum clock counter for every peer.
 */
export function mergeVectorClocks(
  clockA: VectorClockLike,
  clockB: VectorClockLike,
): VectorClock {
  const mapA = toVectorClockMap(clockA);
  const mapB = toVectorClockMap(clockB);

  const merged = new Map<string, number>();
  const allPeers = new Set<string>([...mapA.keys(), ...mapB.keys()]);

  for (const peer of allPeers) {
    const valA = mapA.get(peer) ?? 0;
    const valB = mapB.get(peer) ?? 0;
    merged.set(peer, Math.max(valA, valB));
  }

  return merged;
}

/**
 * Checks whether two vector clocks are causally concurrent.
 */
export function areVectorClocksConcurrent(
  clockA: VectorClockLike,
  clockB: VectorClockLike,
): boolean {
  return compareVectorClocks(clockA, clockB) === 'concurrent';
}

/**
 * Extracts a vector clock representation from a CRDTOperation.
 * Uses op.vectorClock if available, otherwise falls back to single-peer clock.
 */
export function getOperationVectorClock(op: CRDTOperation): VectorClockLike {
  if (op.vectorClock && typeof op.vectorClock === 'object') {
    return op.vectorClock;
  }
  return { [op.peerId]: op.clock };
}

/**
 * Compares two CRDT operations causally based on their embedded vector clocks.
 * - 'equal': Same logical clock timestamp context.
 * - 'before': opA happened causally before opB.
 * - 'after': opA happened causally after opB.
 * - 'concurrent': opA and opB were created independently without causal dependency.
 */
export function compareOperations(
  opA: CRDTOperation,
  opB: CRDTOperation,
): CausalOrder {
  const clockA = getOperationVectorClock(opA);
  const clockB = getOperationVectorClock(opB);
  return compareVectorClocks(clockA, clockB);
}

/**
 * Checks whether two CRDT operations occurred concurrently.
 */
export function areOperationsConcurrent(
  opA: CRDTOperation,
  opB: CRDTOperation,
): boolean {
  return compareOperations(opA, opB) === 'concurrent';
}
