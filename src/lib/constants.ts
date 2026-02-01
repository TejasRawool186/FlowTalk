// Constants for the multilingual chat system

// Default protected terms that should never be translated
export const DEFAULT_GLOSSARY_TERMS = [
  'API',
  'GitHub',
  'Supabase',
  'React',
  'Discord',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'npm',
  'yarn',
  'pnpm',
  'CSS',
  'HTML',
  'JSON',
  'XML',
  'HTTP',
  'HTTPS',
  'REST',
  'GraphQL',
  'SQL',
  'NoSQL',
  'JWT',
  'OAuth',
  'CORS',
  'CDN',
  'DNS',
  'URL',
  'URI',
  'UUID',
  'CLI',
  'GUI',
  'UI',
  'UX',
  'IDE',
  'SDK',
  'API',
  'SaaS',
  'PaaS',
  'IaaS'
]

// Supported language codes (ISO 639-1)
export const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'da': 'Danish',
  'fi': 'Finnish',
  'pl': 'Polish',
  'tr': 'Turkish',
  'th': 'Thai'
} as const

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES

// Message status constants
export const MESSAGE_STATUS = {
  SENT: 'sent',
  TRANSLATING: 'translating',
  TRANSLATED: 'translated',
  FAILED: 'failed'
} as const

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_ENTRIES: 10000,
  CLEANUP_INTERVAL: 60 * 60 * 1000 // 1 hour in milliseconds
}

// Translation configuration
export const TRANSLATION_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  TIMEOUT: 10000, // 10 seconds
  BATCH_SIZE: 10 // Maximum translations per batch
}

// Real-time configuration
export const REALTIME_CONFIG = {
  RECONNECT_DELAY: 1000, // 1 second
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000 // 30 seconds
}