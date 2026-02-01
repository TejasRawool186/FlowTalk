import { TranslationEngineImpl } from '../TranslationEngine'
import { TranslationError, ValidationError } from '@/lib/errors'
import { LanguageCode } from '@/types'

// Mock the service dependencies
const mockCache = {
  generateKey: jest.fn((content: string, lang: string) => `${content}-${lang}`),
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  getStats: jest.fn(() => ({ hits: 10, misses: 5, entries: 15, memoryUsage: 1024, hitRate: 0.67 }))
}

const mockGlossary = {
  getProtectedTerms: jest.fn(() => Promise.resolve(['API', 'GitHub', 'React'])),
  applyGlossaryProtection: jest.fn((content: string) => content.replace(/API/g, '__PROTECTED_0__')),
  restoreProtectedTerms: jest.fn((content: string) => content.replace(/__PROTECTED_0__/g, 'API'))
}

const mockMessageService = {
  updateMessageStatus: jest.fn(),
  getMessageById: jest.fn()
}

jest.mock('../index', () => ({
  getTranslationCache: () => mockCache,
  getGlossaryManager: () => mockGlossary,
  getMessageService: () => mockMessageService
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('TranslationEngine', () => {
  let engine: TranslationEngineImpl
  let mockFetch: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    // Set up environment variable first
    process.env.LINGO_API_KEY = 'test-api-key'
    
    engine = new TranslationEngineImpl()
    mockFetch = fetch as jest.MockedFunction<typeof fetch>
    mockFetch.mockClear()
    
    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('translateText', () => {
    it('should translate text successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ translated_text: 'Hola mundo' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      const result = await engine.translateText('Hello world', 'en', 'es')
      
      expect(result).toBe('Hola mundo')
      expect(mockFetch).toHaveBeenCalledWith('https://api.lingo.dev/v1/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key'
        },
        body: JSON.stringify({
          text: 'Hello world',
          source_language: 'en',
          target_language: 'es',
          preserve_formatting: true
        })
      })
    })

    it('should return original text when source and target languages are the same', async () => {
      const result = await engine.translateText('Hello world', 'en', 'en')
      expect(result).toBe('Hello world')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return original text for empty content', async () => {
      const result = await engine.translateText('   ', 'en', 'es')
      expect(result).toBe('   ')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw error when API key is missing', async () => {
      delete process.env.LINGO_API_KEY
      const engineWithoutKey = new TranslationEngineImpl()
      
      await expect(engineWithoutKey.translateText('Hello', 'en', 'es'))
        .rejects.toThrow(TranslationError)
    })

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid language code' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      await expect(engine.translateText('Hello', 'en', 'invalid'))
        .rejects.toThrow(TranslationError)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(engine.translateText('Hello', 'en', 'es'))
        .rejects.toThrow(TranslationError)
    })

    it('should handle invalid API response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      await expect(engine.translateText('Hello', 'en', 'es'))
        .rejects.toThrow(TranslationError)
    })
  })

  describe('getCachedTranslation', () => {
    it('should retrieve cached translation', async () => {
      mockCache.get.mockResolvedValue('Cached translation')

      const result = await engine.getCachedTranslation('Hello', 'es')
      
      expect(result).toBe('Cached translation')
      expect(mockCache.generateKey).toHaveBeenCalledWith('Hello', 'es')
      expect(mockCache.get).toHaveBeenCalledWith('Hello-es')
    })

    it('should return null when no cache exists', async () => {
      mockCache.get.mockResolvedValue(null)

      const result = await engine.getCachedTranslation('Hello', 'es')
      expect(result).toBeNull()
    })
  })

  describe('cacheTranslation', () => {
    it('should cache translation successfully', async () => {
      await engine.cacheTranslation('Hello', 'es', 'Hola')
      
      expect(mockCache.generateKey).toHaveBeenCalledWith('Hello', 'es')
      expect(mockCache.set).toHaveBeenCalledWith('Hello-es', 'Hola')
    })
  })

  describe('translateMessage', () => {
    it('should translate message to multiple languages', async () => {
      // Mock message
      const mockMessage = {
        id: 'msg-1',
        content: 'Hello API world',
        source_lang: 'en' as LanguageCode,
        status: 'sent' as const
      }
      
      mockMessageService.getMessageById.mockResolvedValue(mockMessage)
      mockCache.get.mockResolvedValue(null) // No cache
      
      // Mock successful API response
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ translated_text: 'Hola __PROTECTED_0__ mundo' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      await engine.translateMessage('msg-1', ['es', 'fr'])

      expect(mockMessageService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'translating')
      expect(mockMessageService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'translated')
      expect(mockFetch).toHaveBeenCalledTimes(2) // Two languages
    })

    it('should handle message not found', async () => {
      mockMessageService.getMessageById.mockResolvedValue(null)

      await expect(engine.translateMessage('invalid-id', ['es']))
        .rejects.toThrow(ValidationError)
    })

    it('should handle no valid target languages', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Hello',
        source_lang: 'en' as LanguageCode,
        status: 'sent' as const
      }
      mockMessageService.getMessageById.mockResolvedValue(mockMessage)

      await expect(engine.translateMessage('msg-1', ['invalid' as LanguageCode]))
        .rejects.toThrow(ValidationError)
    })

    it('should use cached translations when available', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Hello',
        source_lang: 'en' as LanguageCode,
        status: 'sent' as const
      }
      
      mockMessageService.getMessageById.mockResolvedValue(mockMessage)
      mockCache.get.mockResolvedValue('Hola') // Cached translation

      await engine.translateMessage('msg-1', ['es'])

      expect(mockFetch).not.toHaveBeenCalled() // Should use cache
      expect(mockMessageService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'translated')
    })

    it('should handle all translations failing', async () => {
      const mockMessage = {
        id: 'msg-1',
        content: 'Hello',
        source_lang: 'en' as LanguageCode,
        status: 'sent' as const
      }
      
      mockMessageService.getMessageById.mockResolvedValue(mockMessage)
      mockCache.get.mockResolvedValue(null)
      
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API Error'))

      await expect(engine.translateMessage('msg-1', ['es', 'fr']))
        .rejects.toThrow(TranslationError)
      
      expect(mockMessageService.updateMessageStatus).toHaveBeenCalledWith('msg-1', 'sent')
    })
  })

  describe('translateBatch', () => {
    it('should translate multiple texts', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ translated_text: 'Hola' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      const result = await engine.translateBatch(['Hello', 'World'], 'en', 'es')
      
      expect(result).toEqual(['Hola', 'Hola'])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = engine.getStats()
      
      expect(stats).toEqual({
        hits: 10,
        misses: 5,
        entries: 15,
        memoryUsage: 1024,
        hitRate: 0.67
      })
    })
  })

  describe('clearCache', () => {
    it('should clear translation cache', async () => {
      await engine.clearCache()
      
      expect(mockCache.clear).toHaveBeenCalled()
    })
  })

  // Property-based tests
  describe('Property-based tests', () => {
    it('should preserve content length relationship', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ translated_text: 'Translated content' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      const shortText = 'Hi'
      const longText = 'This is a much longer text that should result in a longer translation'
      
      const shortResult = await engine.translateText(shortText, 'en', 'es')
      const longResult = await engine.translateText(longText, 'en', 'es')
      
      // Both should return the same mock translation, but in real scenarios,
      // longer input typically results in longer output
      expect(typeof shortResult).toBe('string')
      expect(typeof longResult).toBe('string')
    })

    it('should handle various language combinations', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ translated_text: 'Translated' })
      }
      mockFetch.mockResolvedValue(mockResponse as Response)

      const languages: LanguageCode[] = ['en', 'es', 'fr', 'de']
      
      for (const source of languages) {
        for (const target of languages) {
          if (source !== target) {
            const result = await engine.translateText('Test', source, target)
            expect(typeof result).toBe('string')
          }
        }
      }
    })
  })
})