// Core data models for the multilingual chat system

export interface Message {
  id: string
  channelId: string
  senderId: string
  content: string
  sourceLanguage: string
  status: 'sent' | 'translating' | 'translated' | 'failed'
  timestamp: Date
  translations?: Translation[]
}

export interface Translation {
  messageId: string
  targetLanguage: string
  translatedContent: string
  createdAt: Date
}

export interface UserProfile {
  id: string
  username: string
  primaryLanguage: string
  avatar?: string
  status?: string
  createdAt: Date
}

export interface GlossaryTerm {
  id: string
  communityId: string
  term: string
  createdBy: string
  createdAt: Date
}

export interface Community {
  id: string
  name: string
  description?: string
  createdBy: string
  createdAt: Date
}

export interface Channel {
  id: string
  communityId: string
  name: string
  description?: string
  createdAt: Date
}

// Status types
export type MessageStatus = 'sent' | 'translating' | 'translated' | 'failed'

// Language code type (ISO 639-1)
export type LanguageCode = string

// Subscription type for real-time updates
export interface Subscription {
  id: string
  unsubscribe: () => void
}

export interface Conversation {
  id: string
  participants: string[] // User IDs
  participantsData?: UserProfile[] // Hydrated user data
  lastMessageAt: Date
  createdAt: Date
}