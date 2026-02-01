// Translation Cache Service implementation

import { TranslationCache } from './interfaces'
import { LanguageCode } from '@/types'
import { CACHE_CONFIG } from '@/lib/constants'
import { CacheError, ValidationError, handleError } from '@/lib/errors'
import { generateHash } from '@/lib/utils'

interface CacheEntry {
  value: string
  timestamp: number
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  hits: number
  misses: number
  entries: number
  memoryUsage: number
  hitRate: number
}

export class TranslationCacheImpl implements TranslationCache {
  private cache = new Map<string, CacheEntry>()
  private stats = {
    hits: 0,
    misses: 0,
    entries: 0,
    memoryUsage: 0
  }
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly maxEntries: number
  private readonly ttl: number
  private readonly cleanupIntervalMs: number

  constructor(
    maxEntries: number = CACHE_CONFIG.MAX_ENTRIES,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL,
    cleanupInterval: number = CACHE_CONFIG.CLEANUP_INTERVAL
  ) {
    this.maxEntries = maxEntries
    this.ttl = ttl
    this.cleanupIntervalMs = cleanupInterval

    // Start periodic cleanup
    this.startCleanup()
  }

  /**
   * Get a cached translation
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!key) {
        throw new ValidationError('Cache key is required')
      }

      const entry = this.cache.get(key)
      
      if (!entry) {
        this.stats.misses++
        return null
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        this.stats.misses++
        this.updateStats()
        return null
      }

      // Update access statistics
      entry.accessCount++
      entry.lastAccessed = Date.now()
      this.stats.hits++

      return entry.value
    } catch (error) {
      throw handleError(error, 'TranslationCache.get')
    }
  }

  /**
   * Set a cached translation
   */
  async set(key: string, value: string): Promise<void> {
    try {
      if (!key || value === undefined || value === null) {
        throw new ValidationError('Cache key and value are required')
      }

      // Check if we need to make room
      if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
        this.evictLeastRecentlyUsed()
      }

      const now = Date.now()
      const entry: CacheEntry = {
        value,
        timestamp: now,
        accessCount: 0,
        lastAccessed: now
      }

      this.cache.set(key, entry)
      this.updateStats()
    } catch (error) {
      throw handleError(error, 'TranslationCache.set')
    }
  }

  /**
   * Generate a cache key from content and target language
   */
  generateKey(content: string, targetLang: LanguageCode): string {
    try {
      if (!content || !targetLang) {
        throw new ValidationError('Content and target language are required for key generation')
      }

      // Normalize content for consistent caching
      const normalizedContent = this.normalizeContent(content)
      const contentHash = generateHash(normalizedContent)
      
      return `${contentHash}:${targetLang.toLowerCase()}`
    } catch (error) {
      throw handleError(error, 'TranslationCache.generateKey')
    }
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear()
      this.stats = {
        hits: 0,
        misses: 0,
        entries: 0,
        memoryUsage: 0
      }
    } catch (error) {
      throw handleError(error, 'TranslationCache.clear')
    }
  }

  /**
   * Remove expired entries
   */
  async cleanup(): Promise<number> {
    try {
      let removedCount = 0
      const now = Date.now()

      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry, now)) {
          this.cache.delete(key)
          removedCount++
        }
      }

      this.updateStats()
      return removedCount
    } catch (error) {
      throw handleError(error, 'TranslationCache.cleanup')
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  /**
   * Check if a key exists in cache (without affecting access stats)
   */
  async has(key: string): Promise<boolean> {
    try {
      if (!key) {
        return false
      }

      const entry = this.cache.get(key)
      return entry !== undefined && !this.isExpired(entry)
    } catch (error) {
      console.warn('Error checking cache key existence:', error)
      return false
    }
  }

  /**
   * Get multiple cached translations at once
   */
  async getMultiple(keys: string[]): Promise<Map<string, string | null>> {
    try {
      const results = new Map<string, string | null>()

      for (const key of keys) {
        const value = await this.get(key)
        results.set(key, value)
      }

      return results
    } catch (error) {
      throw handleError(error, 'TranslationCache.getMultiple')
    }
  }

  /**
   * Set multiple cached translations at once
   */
  async setMultiple(entries: Map<string, string>): Promise<void> {
    try {
      for (const [key, value] of entries.entries()) {
        await this.set(key, value)
      }
    } catch (error) {
      throw handleError(error, 'TranslationCache.setMultiple')
    }
  }

  /**
   * Remove a specific key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (!key) {
        return false
      }

      const existed = this.cache.has(key)
      this.cache.delete(key)
      
      if (existed) {
        this.updateStats()
      }

      return existed
    } catch (error) {
      throw handleError(error, 'TranslationCache.delete')
    }
  }

  /**
   * Get cache keys matching a pattern
   */
  getKeys(pattern?: RegExp): string[] {
    try {
      const keys = Array.from(this.cache.keys())
      
      if (!pattern) {
        return keys
      }

      return keys.filter(key => pattern.test(key))
    } catch (error) {
      console.warn('Error getting cache keys:', error)
      return []
    }
  }

  /**
   * Warm up cache with common translations
   */
  async warmUp(commonTranslations: Map<string, string>): Promise<void> {
    try {
      console.log(`Warming up cache with ${commonTranslations.size} entries...`)
      
      for (const [key, value] of commonTranslations.entries()) {
        await this.set(key, value)
      }

      console.log(`Cache warmed up successfully. Current size: ${this.cache.size}`)
    } catch (error) {
      console.warn('Error warming up cache:', error)
    }
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
      
      this.cache.clear()
      this.stats = {
        hits: 0,
        misses: 0,
        entries: 0,
        memoryUsage: 0
      }
    } catch (error) {
      console.warn('Error destroying cache:', error)
    }
  }

  // Private helper methods

  private isExpired(entry: CacheEntry, now: number = Date.now()): boolean {
    return (now - entry.timestamp) > this.ttl
  }

  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return

    let oldestKey: string | null = null
    let oldestTime = Infinity

    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    // Remove the oldest entry
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private updateStats(): void {
    this.stats.entries = this.cache.size
    this.stats.memoryUsage = this.estimateMemoryUsage()
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation: key + value + metadata
      totalSize += key.length * 2 // UTF-16 characters
      totalSize += entry.value.length * 2
      totalSize += 32 // Estimated overhead for entry metadata
    }

    return totalSize
  }

  private normalizeContent(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase() // Case insensitive caching
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const removed = await this.cleanup()
        if (removed > 0) {
          console.log(`Cache cleanup: removed ${removed} expired entries`)
        }
      } catch (error) {
        console.warn('Error during cache cleanup:', error)
      }
    }, this.cleanupIntervalMs)
  }

  /**
   * Export cache data for persistence (if needed)
   */
  exportData(): { [key: string]: { value: string; timestamp: number } } {
    const data: { [key: string]: { value: string; timestamp: number } } = {}
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        data[key] = {
          value: entry.value,
          timestamp: entry.timestamp
        }
      }
    }

    return data
  }

  /**
   * Import cache data from persistence (if needed)
   */
  async importData(data: { [key: string]: { value: string; timestamp: number } }): Promise<void> {
    try {
      const now = Date.now()
      let importedCount = 0

      for (const [key, item] of Object.entries(data)) {
        // Only import non-expired entries
        if ((now - item.timestamp) <= this.ttl) {
          const entry: CacheEntry = {
            value: item.value,
            timestamp: item.timestamp,
            accessCount: 0,
            lastAccessed: now
          }
          
          this.cache.set(key, entry)
          importedCount++
        }
      }

      this.updateStats()
      console.log(`Imported ${importedCount} cache entries`)
    } catch (error) {
      throw handleError(error, 'TranslationCache.importData')
    }
  }
}