import { TranslationEngine } from './interfaces'
import { LanguageCode } from '@/types'
import { getTranslationCache } from './index'
import { getGlossaryManager } from './index'
import { getMessageService } from './index'
import { TranslationError, ValidationError } from '@/lib/errors'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { messageParser } from '@/lib/MessageParser'

/**
 * Translation Engine implementation with Lingo.dev API integration
 * Handles translation requests with caching and glossary protection
 */
export class TranslationEngineImpl implements TranslationEngine {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.lingo.dev/v1'
  private readonly cache = getTranslationCache()
  private readonly glossary = getGlossaryManager()
  private readonly messageService = getMessageService()

  constructor() {
    this.apiKey = process.env.LINGO_API_KEY || ''
    if (!this.apiKey) {
      console.warn('LINGO_API_KEY not found in environment variables')
    }
  }

  /**
   * Translate a message into multiple target languages
   * Updates message status and stores translations in database
   */
  async translateMessage(messageId: string, targetLanguages: LanguageCode[]): Promise<void> {
    try {
      // Update message status to translating
      await this.messageService.updateMessageStatus(messageId, 'translating')

      // Get the original message
      const message = await this.messageService.getMessageById(messageId)
      if (!message) {
        throw new ValidationError(`Message not found: ${messageId}`)
      }

      // Validate target languages
      const validLanguages = targetLanguages.filter(lang =>
        Object.keys(SUPPORTED_LANGUAGES).includes(lang)
      )

      if (validLanguages.length === 0) {
        throw new ValidationError('No valid target languages provided')
      }

      // Get community ID from message (assuming we can derive it)
      // For now, using 'default' community
      const communityId = 'default'
      const protectedTerms = await this.glossary.getProtectedTerms(communityId)

      // Parse message content to handle code blocks properly
      const parsedMessage = messageParser.parse(message.content)
      if (!parsedMessage.isValid) {
        throw new ValidationError(`Invalid message content: ${parsedMessage.errors.join(', ')}`)
      }

      // Get translatable content (with code blocks replaced by placeholders)
      const translatableContent = messageParser.getTranslatableContent(parsedMessage)

      // Protect glossary terms in translatable content
      const protectedContent = this.glossary.applyGlossaryProtection(
        translatableContent,
        protectedTerms
      )

      // Translate to each target language
      const translationPromises = validLanguages.map(async (targetLang) => {
        try {
          // Check cache first
          const cached = await this.getCachedTranslation(message.content, targetLang)
          if (cached) {
            return { targetLang, translation: cached, fromCache: true }
          }

          // Translate using API
          const translation = await this.translateText(
            protectedContent,
            message.sourceLanguage,
            targetLang
          )

          // Restore protected terms
          let restoredTranslation = this.glossary.restoreProtectedTerms(
            translation,
            translatableContent
          )

          // Restore code blocks and inline code
          restoredTranslation = messageParser.restoreAllCode(restoredTranslation, parsedMessage)

          // Cache the translation
          await this.cacheTranslation(message.content, targetLang, restoredTranslation)

          return { targetLang, translation: restoredTranslation, fromCache: false }
        } catch (error) {
          console.error(`Translation failed for ${targetLang}:`, error)
          return { targetLang, translation: message.content, fromCache: false, error }
        }
      })

      const results = await Promise.allSettled(translationPromises)

      // Process results and store translations
      const successCount = results.filter(result =>
        result.status === 'fulfilled' && !result.value.error
      ).length

      if (successCount === 0) {
        throw new TranslationError('All translations failed')
      }

      // Update message status to translated
      await this.messageService.updateMessageStatus(messageId, 'translated')

    } catch (error) {
      // Update message status to failed
      await this.messageService.updateMessageStatus(messageId, 'sent')
      throw error
    }
  }

  /**
   * Get cached translation if available
   */
  async getCachedTranslation(content: string, targetLang: LanguageCode): Promise<string | null> {
    const key = this.cache.generateKey(content, targetLang)
    return await this.cache.get(key)
  }

  /**
   * Cache a translation for future use
   */
  async cacheTranslation(content: string, targetLang: LanguageCode, translation: string): Promise<void> {
    const key = this.cache.generateKey(content, targetLang)
    await this.cache.set(key, translation)
  }

  /**
   * Translate text using Lingo.dev SDK
   */
  async translateText(content: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string> {
    if (!this.apiKey) {
      throw new TranslationError('Translation API key not configured')
    }

    if (sourceLang === targetLang) {
      return content
    }

    if (!content.trim()) {
      return content
    }

    try {
      // Use Lingo.dev SDK - import from correct path
      const { LingoDotDevEngine } = await import('lingo.dev/sdk')

      const lingoEngine = new LingoDotDevEngine({
        apiKey: this.apiKey,
      })

      // Use the SDK's localizeText method
      const result = await lingoEngine.localizeText(content, {
        sourceLocale: sourceLang,
        targetLocale: targetLang,
      })

      if (!result) {
        throw new TranslationError('Invalid response from Lingo.dev SDK')
      }

      return result
    } catch (error) {
      if (error instanceof TranslationError) {
        throw error
      }

      // Network or other errors
      throw new TranslationError(
        `Translation API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        JSON.stringify({ originalError: String(error) })
      )
    }
  }

  /**
   * Batch translate multiple texts (utility method)
   */
  async translateBatch(
    texts: string[],
    sourceLang: LanguageCode,
    targetLang: LanguageCode
  ): Promise<string[]> {
    const translations = await Promise.all(
      texts.map(text => this.translateText(text, sourceLang, targetLang))
    )
    return translations
  }

  /**
   * Get translation statistics
   */
  getStats() {
    return this.cache.getStats()
  }

  /**
   * Clear translation cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
  }
}