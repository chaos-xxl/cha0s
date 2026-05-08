/**
 * A tiny LRU-ish cache used to deduplicate embedding requests.
 *
 * Why this is worth doing:
 *  - A topic space's keywords rarely change between messages, so embedding
 *    them once and reusing is a huge cost win.
 *  - The same user phrase often repeats within a session ("yes", "thanks",
 *    "book it").
 *
 * The implementation is deliberately minimal — a Map with an insertion-
 * order eviction. Not thread-safe; that's fine for Node/browser single-
 * thread use. Not async; entries are plain arrays.
 */
export interface VectorCache {
  get(key: string): number[] | undefined;
  set(key: string, value: number[]): void;
  clear(): void;
  readonly size: number;
}

export interface VectorCacheOptions {
  /**
   * Maximum number of entries to keep. When exceeded, the oldest entry
   * is evicted. Default: 1024.
   */
  readonly maxEntries?: number;
}

export function createVectorCache(options: VectorCacheOptions = {}): VectorCache {
  const maxEntries = options.maxEntries ?? 1024;
  const store = new Map<string, number[]>();

  return {
    get(key) {
      const existing = store.get(key);
      if (!existing) return undefined;
      // Refresh recency: delete + re-insert puts it at the tail.
      store.delete(key);
      store.set(key, existing);
      return existing;
    },
    set(key, value) {
      if (store.has(key)) {
        store.delete(key);
      } else if (store.size >= maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, value);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
  };
}
