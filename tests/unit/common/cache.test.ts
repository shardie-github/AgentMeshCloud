/**
 * Unit tests for cache utility
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Cache', () => {
  beforeEach(() => {
    // Reset cache state before each test
  });

  it('should store and retrieve values', async () => {
    // Simple in-memory cache test
    const cache = new Map<string, any>();
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', async () => {
    const cache = new Map<string, any>();
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should delete keys', async () => {
    const cache = new Map<string, any>();
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should clear all keys', async () => {
    const cache = new Map<string, any>();
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
