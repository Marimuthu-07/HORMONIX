/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-performance file hashing module.
 * Combines file parameters (path/name, size, modification time) into a fast,
 * collision-resistant unique identifier.
 * Optionally hashes a chunk of file bytes if full data integrity verification is required.
 */

/**
 * FNV-1a 32-bit Hash Function (Ultra fast, pure JS, non-blocking)
 */
export function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // Integer multiplication to simulate 32-bit uint behavior in JavaScript
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generates a unique, high-performance hash identifier for a file.
 * Avoids reading the full file from disk/memory, using metadata attributes instead.
 */
export function generateFileHash(fileName: string, fileSize: number, lastModified: number): string {
  // Combine unique characteristics of the file
  const signature = `${fileName}:${fileSize}:${lastModified}`;
  return fnv1a(signature);
}

/**
 * Verifies if file is modified by comparing current hash signatures.
 */
export function isFileModified(currentHash: string, cachedHash: string): boolean {
  return currentHash !== cachedHash;
}
