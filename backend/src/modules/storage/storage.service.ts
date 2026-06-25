import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { nanoid } from 'nanoid';
import type { FileStat, SaveResult, StorageInput, StorageService } from './storage.types.js';

/**
 * Local-disk implementation of `StorageService`.
 *
 * Files are written to `uploadDir` using a `nanoid`-derived key as the sole
 * on-disk filename component. The client-supplied filename is **never** used as
 * part of the storage path, preventing path-traversal attacks.
 *
 * Swap this class for an S3-backed implementation in S-18 without changing any
 * callers — they depend only on the `StorageService` interface.
 */
export class LocalDiskStorageService implements StorageService {
  private readonly uploadDir: string;

  constructor(uploadDir: string) {
    this.uploadDir = uploadDir;
  }

  /**
   * Ensures the upload directory exists. Called once at application start.
   * Safe to call multiple times (uses `recursive: true`).
   */
  async ensureDir(): Promise<void> {
    await mkdir(this.uploadDir, { recursive: true });
  }

  async save(input: StorageInput): Promise<SaveResult> {
    const storageKey = nanoid();
    const destPath = this.keyToPath(storageKey);

    const writeStream = createWriteStream(destPath);
    await pipeline(input.stream, writeStream);

    // Determine final size from the filesystem (avoids buffering the whole file).
    const fileStat = await stat(destPath);
    return { storageKey, size: fileStat.size };
  }

  createReadStream(storageKey: string): Readable | null {
    const filePath = this.keyToPath(storageKey);
    try {
      // createReadStream is lazy — it only opens the file when data is consumed.
      // We use a try/catch here only if the path itself is bad; actual missing-
      // file errors surface as stream errors when consumed.
      return createReadStream(filePath);
    } catch {
      return null;
    }
  }

  async stat(storageKey: string): Promise<FileStat | null> {
    try {
      const fileStat = await stat(this.keyToPath(storageKey));
      return { size: fileStat.size };
    } catch {
      return null;
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await unlink(this.keyToPath(storageKey));
    } catch {
      // Silently ignore "file not found" — idempotent delete.
    }
  }

  private keyToPath(storageKey: string): string {
    return join(this.uploadDir, storageKey);
  }
}
