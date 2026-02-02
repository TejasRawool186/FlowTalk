// Service interfaces for the multilingual chat system

import { Message, Translation, GlossaryTerm, UserProfile, LanguageCode, Subscription } from '@/types'

export interface MessageService {
  createMessage(
    channelId: string,
    content: string,
    senderId: string,
    detectedLanguage?: string,
    attachment?: any
  ): Promise<Message>
  getChannelMessages(channelId: string, limit?: number): Promise<Message[]>
  updateMessageStatus(messageId: string, status: Message['status']): Promise<void>
  getMessageById(messageId: string): Promise<Message | null>
  deleteMessage(messageId: string): Promise<void>
  getChannelMessagesForUser(channelId: string, userId: string, limit?: number): Promise<Message[]>
  searchMessages(channelId: string, query: string, limit?: number): Promise<Message[]>
  getChannelMessageCount(channelId: string): Promise<number>
}

// ... existing interfaces ...

export interface UserService {
  getUserProfile(userId: string): Promise<UserProfile | null>
}

export interface TranslationEngine {
  translateMessage(messageId: string, targetLanguages: LanguageCode[]): Promise<void>
  getCachedTranslation(content: string, targetLang: LanguageCode): Promise<string | null>
  cacheTranslation(content: string, targetLang: LanguageCode, translation: string): Promise<void>
  translateText(content: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string>
}

export interface ProtectedTerm {
  term: string
  category: 'technical' | 'brand' | 'proper_noun' | 'custom'
  romanizedVariants?: string[]
  preserveCase: boolean
}

export interface ProtectedContent {
  processedContent: string
  protectedSegments: Array<{
    original: string
    placeholder: string
    position: number
  }>
}

export interface GlossaryManager {
  getProtectedTerms(communityId: string): Promise<string[]>
  addProtectedTerm(communityId: string, term: string): Promise<void>
  applyGlossaryProtection(content: string, terms: string[]): string
  getDefaultGlossary(): string[]
  removeProtectedTerm(communityId: string, term: string): Promise<void>
  getCustomTerms(communityId: string): Promise<GlossaryTerm[]>
  restoreProtectedTerms(content: string, originalContent: string): string
  isTermProtected(communityId: string, term: string): Promise<boolean>
  addMultipleTerms(communityId: string, terms: string[]): Promise<void>
  searchTerms(communityId: string, query: string): Promise<string[]>
  identifyProperNouns(content: string): Promise<string[]>
  expandDefaultGlossary(): Promise<ProtectedTerm[]>
  applyGlossaryProtectionDetailed(content: string, terms: ProtectedTerm[]): Promise<ProtectedContent>
}

export interface RealTimeBroadcaster {
  broadcastMessage(channelId: string, message: Message): Promise<void>
  broadcastTranslation(messageId: string, translation: Translation): Promise<void>
  subscribeToChannel(channelId: string, callback: (message: Message) => void): Subscription
  subscribeToTranslations(messageId: string, callback: (translation: Translation) => void): Subscription
}

export interface LanguageDetectionResult {
  language: LanguageCode
  confidence: number
  isRomanized: boolean
  fallbackSuggestions?: LanguageCode[]
}

export interface MixedLanguageResult {
  primaryLanguage: LanguageCode
  segments: Array<{
    text: string
    language: LanguageCode
    isProtected: boolean
  }>
}

export interface LanguageDetector {
  detectLanguage(content: string): Promise<LanguageDetectionResult>
  detectPrimaryLanguage(content: string): Promise<LanguageCode>
  isLanguageDetectionUncertain(content: string): Promise<boolean>
  isRomanizedNativeLanguage(content: string): Promise<boolean>
  getConfidenceScore(content: string, language: LanguageCode): Promise<number>
  detectMixedLanguageContent(content: string): Promise<MixedLanguageResult>
}

export interface TranslationCache {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  generateKey(content: string, targetLang: LanguageCode): string
  clear(): Promise<void>
  cleanup(): Promise<number>
  has(key: string): Promise<boolean>
  getMultiple(keys: string[]): Promise<Map<string, string | null>>
  setMultiple(entries: Map<string, string>): Promise<void>
  delete(key: string): Promise<boolean>
  getKeys(pattern?: RegExp): string[]
  getStats(): { hits: number; misses: number; entries: number; memoryUsage: number; hitRate: number }
}