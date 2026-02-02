// MongoDB-based service factory and exports - updated


import { MongoMessageService } from './MongoMessageService'
import { MongoCommunityService } from './MongoCommunityService'
import { MongoConversationService } from './MongoConversationService'
import { LanguageDetectorImpl } from './LanguageDetector'
import { GlossaryManagerImpl } from './GlossaryManager'
import { TranslationCacheImpl } from './TranslationCache'
import { TranslationEngineImpl } from './TranslationEngine'
import { MessageService, LanguageDetector, GlossaryManager, TranslationCache, TranslationEngine } from './interfaces'

// Service instances (singletons)
let messageServiceInstance: MessageService | null = null
let communityServiceInstance: MongoCommunityService | null = null
let conversationServiceInstance: MongoConversationService | null = null
let languageDetectorInstance: LanguageDetector | null = null
let glossaryManagerInstance: GlossaryManager | null = null
let translationCacheInstance: TranslationCache | null = null
let translationEngineInstance: TranslationEngine | null = null

/**
 * Get MessageService instance (singleton) - MongoDB-based
 */
export function getMessageService(): MessageService {
  if (!messageServiceInstance) {
    messageServiceInstance = new MongoMessageService()
  }
  return messageServiceInstance
}

/**
 * Get CommunityService instance (singleton) - MongoDB-based
 */
export function getCommunityService(): MongoCommunityService {
  if (!communityServiceInstance) {
    communityServiceInstance = new MongoCommunityService()
  }
  return communityServiceInstance
}

/**
 * Get ConversationService instance (singleton) - MongoDB-based
 */
export function getConversationService(): MongoConversationService {
  if (!conversationServiceInstance) {
    conversationServiceInstance = new MongoConversationService()
  }
  return conversationServiceInstance
}

/**
 * Get LanguageDetector instance (singleton)
 */
export function getLanguageDetector(): LanguageDetector {
  if (!languageDetectorInstance) {
    languageDetectorInstance = new LanguageDetectorImpl()
  }
  return languageDetectorInstance
}

/**
 * Get GlossaryManager instance (singleton)
 */
export function getGlossaryManager(): GlossaryManager {
  if (!glossaryManagerInstance) {
    glossaryManagerInstance = new GlossaryManagerImpl()
  }
  return glossaryManagerInstance
}

/**
 * Get TranslationCache instance (singleton)
 */
export function getTranslationCache(): TranslationCache {
  if (!translationCacheInstance) {
    translationCacheInstance = new TranslationCacheImpl()
  }
  return translationCacheInstance
}

/**
 * Get TranslationEngine instance (singleton)
 */
export function getTranslationEngine(): TranslationEngine {
  if (!translationEngineInstance) {
    translationEngineInstance = new TranslationEngineImpl()
  }
  return translationEngineInstance
}

// Export service interfaces
export * from './interfaces'

// Export MongoDB service implementations
export { MongoMessageService } from './MongoMessageService'
export { MongoCommunityService } from './MongoCommunityService'
export { MongoConversationService } from './MongoConversationService'

// Export other service implementations
export { LanguageDetectorImpl } from './LanguageDetector'
export { GlossaryManagerImpl } from './GlossaryManager'
export { TranslationCacheImpl } from './TranslationCache'
export { TranslationEngineImpl } from './TranslationEngine'

