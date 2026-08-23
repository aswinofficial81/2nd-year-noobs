import { createHash } from 'node:crypto';
/**
 * Computes a SHA-256 hash for the given data.
 * @param data Buffer, string, or Uint8Array to hash.
 * @returns Hex-encoded SHA-256 hash string.
 */
export function computeHash(data) {
    const hash = createHash('sha256');
    if (typeof data === 'string') {
        hash.update(data, 'utf8');
    }
    else {
        hash.update(data);
    }
    return hash.digest('hex');
}
//# sourceMappingURL=hash.js.map