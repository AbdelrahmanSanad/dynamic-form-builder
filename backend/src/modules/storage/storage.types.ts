import type { Readable } from 'node:stream';

/**
 * Minimal abstraction for file storage.
 *
 * The local-disk implementation (`LocalDiskStorageService`) is used in
 * development and small deployments. Story S-18 will supply an S3-backed
 * implementation by swapping this interface — no other code needs to change.
 */
export interface StorageInput {
  /** The readable stream of file bytes. */
  stream: Readable;
  /** Original client-supplied filename — stored as metadata only, never used as a path. */
  filename: string;
  /** MIME type reported by the client (already validated by the caller). */
  mimeType: string;
}

export interface SaveResult {
  /** Opaque, randomly-generated key that uniquely identifies this stored file. */
  storageKey: string;
  /** Actual byte size written to storage. */
  size: number;
}

export interface FileStat {
  size: number;
}

export interface StorageService {
  /**
   * Persist the incoming stream and return the generated `storageKey` and
   * final byte count. Resolves only after the stream is fully flushed.
   */
  save(input: StorageInput): Promise<SaveResult>;

  /**
   * Open a read stream for a previously saved file.
   * Returns `null` if the key does not exist.
   */
  createReadStream(storageKey: string): Readable | null;

  /** Returns basic metadata, or `null` if the key does not exist. */
  stat(storageKey: string): Promise<FileStat | null>;

  /** Deletes the stored file. Resolves silently if the key does not exist. */
  delete(storageKey: string): Promise<void>;
}
