import { describe, expect, it } from 'vitest';
import { createVectorCache } from './cache.js';

describe('createVectorCache', () => {
  it('starts empty', () => {
    const cache = createVectorCache();
    expect(cache.size).toBe(0);
    expect(cache.get('x')).toBeUndefined();
  });

  it('stores and retrieves vectors by key', () => {
    const cache = createVectorCache();
    cache.set('hello', [1, 2, 3]);
    expect(cache.get('hello')).toEqual([1, 2, 3]);
    expect(cache.size).toBe(1);
  });

  it('re-setting an existing key updates in place', () => {
    const cache = createVectorCache();
    cache.set('x', [1]);
    cache.set('x', [2]);
    expect(cache.get('x')).toEqual([2]);
    expect(cache.size).toBe(1);
  });

  it('evicts the oldest entry when maxEntries is exceeded', () => {
    const cache = createVectorCache({ maxEntries: 2 });
    cache.set('a', [1]);
    cache.set('b', [2]);
    cache.set('c', [3]);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toEqual([2]);
    expect(cache.get('c')).toEqual([3]);
  });

  it('refreshes recency on get: recently read entries survive eviction', () => {
    const cache = createVectorCache({ maxEntries: 2 });
    cache.set('a', [1]);
    cache.set('b', [2]);
    cache.get('a'); // 'a' becomes most-recently used
    cache.set('c', [3]); // should evict 'b', not 'a'
    expect(cache.get('a')).toEqual([1]);
    expect(cache.get('b')).toBeUndefined();
  });

  it('clear removes every entry', () => {
    const cache = createVectorCache();
    cache.set('x', [1]);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('x')).toBeUndefined();
  });
});
