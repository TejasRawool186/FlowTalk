// Unit tests for TranslationCache

import { TranslationCacheImpl } from '../TranslationCache'
import { ValidationError } from '@/lib/errors'

// Mock timers for testing TTL and cleanup
jest.useFakeTimers()

describe('TranslationCache', () => {
  let cache: TranslationCacheImpl
  
  beforeEach(() => {
    // Create cache with short TTL for testing
    cache = new TranslationCacheImpl(100, 1000, 500) // 100 entries, 1s TTL, 0.5s cleanup
    jest.clearAllTimers()
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1')
      const result = await cache.get('key1')
      
      expect(result).toBe('value1')
    })

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent')
      
      expect(result).toBeNull()
    })

    it('should validate required parameters', async () => {
      await expect(cache.get('')).rejects.toThrow(ValidationError)
      await expect(cache.set('', 'value')).rejects.toThrow(ValidationError)
      await expect(cache.set('key', null as any)).rejects.toThrow(ValidationError)
    })

    it('should handle multiple values', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')

      expect(await cache.get('key1')).toBe('value1')
      expect(await cache.get('key2')).toBe('value2')
      expect(await cache.get('key3')).toBe('value3')
    })

    it('should update existing values', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key1', 'updated_value')
      
      const result = await cache.get('key1')
      expect(result).toBe('updated_value')
    })
  })

  describe('key generation', () => {
    it('should generate consistent keys for same content and language', () => {
      const key1 = cache.generateKey('Hello world', 'es')
      const key2 = cache.generateKey('Hello world', 'es')
      
      expect(key1).toBe(key2)
    })

    it('should generate different keys for different content', () => {
      const key1 = cache.generateKey('Hello world', 'es')
      const key2 = cache.generateKey('Goodbye world', 'es')
      
      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different languages', () => {
      const key1 = cache.generateKey('Hello world', 'es')
      const key2 = cache.generateKey('Hello world', 'fr')
      
      expect(key1).not.toBe(key2)
    })

    it('should normalize content for consistent keys', () => {
      const key1 = cache.generateKey('  Hello   world  ', 'es')
      const key2 = cache.generateKey('hello world', 'es')
      
      expect(key1).toBe(key2)
    })

    it('should validate required parameters for key generation', () => {
      expect(() => cache.generateKey('', 'es')).toThrow(ValidationError)
      expect(() => cache.generateKey('content', '')).toThrow(ValidationError)
    })

    it('should handle special characters in content', () => {
      const key1 = cache.generateKey('Hello! How are you?', 'es')
      const key2 = cache.generateKey('Hello! How are you?', 'es')
      
      expect(key1).toBe(key2)
      expect(key1).toContain(':es')
    })
  })

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('key1', 'value1')
      
      // Verify it exists initially
      expect(await cache.get('key1')).toBe('value1')
      
      // Fast forward past TTL
      jest.advanceTimersByTime(1500)
      
      // Should be expired now
      expect(await cache.get('key1')).toBeNull()
    })

    it('should not expire entries before TTL', async () => {
      await cache.set('key1', 'value1')
      
      // Fast forward but not past TTL
      jest.advanceTimersByTime(500)
      
      // Should still exist
      expect(await cache.get('key1')).toBe('value1')
    })

    it('should update access time on get', async () => {
      await cache.set('key1', 'value1')
      
      // Fast forward halfway to TTL
      jest.advanceTimersByTime(500)
      
      // Access the key (should update access count but not extend TTL)
      await cache.get('key1')
      
      // Fast forward another 700ms (total 1200ms, past TTL)
      jest.advanceTimersByTime(700)
      
      // Should be expired since TTL is based on creation time, not access time
      expect(await cache.get('key1')).toBeNull()
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used entries when at capacity', async () => {
      // Create cache with capacity of 2 for simpler testing
      const smallCache = new TranslationCacheImpl(2, 10000, 1000)
      
      try {
        // Fill to capacity with some time between entries
        await smallCache.set('key1', 'value1')
        jest.advanceTimersByTime(10) // Small advance to differentiate timestamps
        await smallCache.set('key2', 'value2')
        
        jest.advanceTimersByTime(10) // Small advance
        
        // Access key1 to make it recently used (key2 becomes LRU)
        await smallCache.get('key1')
        
        jest.advanceTimersByTime(10) // Small advance
        
        // Add another entry, should evict key2 (least recently used)
        await smallCache.set('key3', 'value3')
        
        expect(await smallCache.get('key1')).toBe('value1') // Should exist (recently used)
        expect(await smallCache.get('key2')).toBeNull() // Should be evicted (LRU)
        expect(await smallCache.get('key3')).toBe('value3') // Should exist (just added)
      } finally {
        smallCache.destroy()
      }
    })

    it('should not evict when updating existing keys', async () => {
      const smallCache = new TranslationCacheImpl(2, 10000, 1000)
      
      try {
        await smallCache.set('key1', 'value1')
        await smallCache.set('key2', 'value2')
        
        // Update existing key (should not trigger eviction)
        await smallCache.set('key1', 'updated_value1')
        
        expect(await smallCache.get('key1')).toBe('updated_value1')
        expect(await smallCache.get('key2')).toBe('value2')
      } finally {
        smallCache.destroy()
      }
    })
  })

  describe('cleanup operations', () => {
    it('should remove expired entries during cleanup', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      
      // Fast forward past TTL
      jest.advanceTimersByTime(1500)
      
      const removedCount = await cache.cleanup()
      
      expect(removedCount).toBe(2)
      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
    })

    it('should not remove non-expired entries during cleanup', async () => {
      await cache.set('key1', 'value1')
      
      // Fast forward but not past TTL
      jest.advanceTimersByTime(500)
      
      const removedCount = await cache.cleanup()
      
      expect(removedCount).toBe(0)
      expect(await cache.get('key1')).toBe('value1')
    })

    it('should run automatic cleanup periodically', async () => {
      await cache.set('key1', 'value1')
      
      // Fast forward past TTL
      jest.advanceTimersByTime(1500)
      
      // Fast forward to trigger cleanup interval
      jest.advanceTimersByTime(500)
      
      // Entry should be cleaned up automatically
      expect(await cache.get('key1')).toBeNull()
    })
  })

  describe('clear operation', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')
      
      await cache.clear()
      
      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBeNull()
    })

    it('should reset statistics', async () => {
      await cache.set('key1', 'value1')
      await cache.get('key1') // Hit
      await cache.get('nonexistent') // Miss
      
      await cache.clear()
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.entries).toBe(0)
    })
  })

  describe('statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1')
      
      // Generate some hits and misses
      await cache.get('key1') // Hit
      await cache.get('key1') // Hit
      await cache.get('nonexistent') // Miss
      await cache.get('nonexistent2') // Miss
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(2)
      expect(stats.hitRate).toBe(50)
    })

    it('should track entry count', async () => {
      const initialStats = cache.getStats()
      expect(initialStats.entries).toBe(0)
      
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      
      const stats = cache.getStats()
      expect(stats.entries).toBe(2)
    })

    it('should estimate memory usage', async () => {
      const initialStats = cache.getStats()
      expect(initialStats.memoryUsage).toBe(0)
      
      await cache.set('key1', 'value1')
      
      const stats = cache.getStats()
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })

    it('should calculate hit rate correctly', async () => {
      // No requests yet
      expect(cache.getStats().hitRate).toBe(0)
      
      await cache.set('key1', 'value1')
      
      // All hits
      await cache.get('key1')
      await cache.get('key1')
      expect(cache.getStats().hitRate).toBe(100)
      
      // Mix of hits and misses
      await cache.get('nonexistent')
      expect(cache.getStats().hitRate).toBe(66.67)
    })
  })

  describe('has operation', () => {
    it('should return true for existing keys', async () => {
      await cache.set('key1', 'value1')
      
      expect(await cache.has('key1')).toBe(true)
    })

    it('should return false for non-existent keys', async () => {
      expect(await cache.has('nonexistent')).toBe(false)
    })

    it('should return false for expired keys', async () => {
      await cache.set('key1', 'value1')
      
      // Fast forward past TTL
      jest.advanceTimersByTime(1500)
      
      expect(await cache.has('key1')).toBe(false)
    })

    it('should not affect access statistics', async () => {
      await cache.set('key1', 'value1')
      
      const statsBefore = cache.getStats()
      await cache.has('key1')
      const statsAfter = cache.getStats()
      
      expect(statsAfter.hits).toBe(statsBefore.hits)
      expect(statsAfter.misses).toBe(statsBefore.misses)
    })
  })

  describe('bulk operations', () => {
    it('should get multiple values', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')
      
      const results = await cache.getMultiple(['key1', 'key2', 'nonexistent'])
      
      expect(results.get('key1')).toBe('value1')
      expect(results.get('key2')).toBe('value2')
      expect(results.get('nonexistent')).toBeNull()
    })

    it('should set multiple values', async () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3']
      ])
      
      await cache.setMultiple(entries)
      
      expect(await cache.get('key1')).toBe('value1')
      expect(await cache.get('key2')).toBe('value2')
      expect(await cache.get('key3')).toBe('value3')
    })
  })

  describe('delete operation', () => {
    it('should delete existing keys', async () => {
      await cache.set('key1', 'value1')
      
      const deleted = await cache.delete('key1')
      
      expect(deleted).toBe(true)
      expect(await cache.get('key1')).toBeNull()
    })

    it('should return false for non-existent keys', async () => {
      const deleted = await cache.delete('nonexistent')
      
      expect(deleted).toBe(false)
    })

    it('should update statistics', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      
      expect(cache.getStats().entries).toBe(2)
      
      await cache.delete('key1')
      
      expect(cache.getStats().entries).toBe(1)
    })
  })

  describe('key management', () => {
    it('should return all keys', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')
      
      const keys = cache.getKeys()
      
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
      expect(keys.length).toBe(3)
    })

    it('should filter keys by pattern', async () => {
      await cache.set('user:1', 'value1')
      await cache.set('user:2', 'value2')
      await cache.set('post:1', 'value3')
      
      const userKeys = cache.getKeys(/^user:/)
      
      expect(userKeys).toContain('user:1')
      expect(userKeys).toContain('user:2')
      expect(userKeys).not.toContain('post:1')
      expect(userKeys.length).toBe(2)
    })
  })

  describe('error handling', () => {
    it('should handle errors gracefully in has operation', async () => {
      const result = await cache.has('')
      expect(result).toBe(false)
    })

    it('should handle errors gracefully in getKeys operation', () => {
      // Test with a complex regex that might cause issues
      const keys = cache.getKeys(/^test.*$/)
      expect(Array.isArray(keys)).toBe(true)
    })
  })

  describe('destroy operation', () => {
    it('should clean up resources', () => {
      cache.destroy()
      
      const stats = cache.getStats()
      expect(stats.entries).toBe(0)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })
})