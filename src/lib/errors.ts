// Error handling utilities for the multilingual chat system

export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'ChatError'
  }
}

export class TranslationError extends ChatError {
  constructor(message: string, public originalContent?: string) {
    super(message, 'TRANSLATION_ERROR', 500)
    this.name = 'TranslationError'
  }
}

export class LanguageDetectionError extends ChatError {
  constructor(message: string, public content?: string) {
    super(message, 'LANGUAGE_DETECTION_ERROR', 500)
    this.name = 'LanguageDetectionError'
  }
}

export class CacheError extends ChatError {
  constructor(message: string) {
    super(message, 'CACHE_ERROR', 500)
    this.name = 'CacheError'
  }
}

export class DatabaseError extends ChatError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500)
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends ChatError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ChatError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ChatError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ChatError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404)
    this.name = 'NotFoundError'
  }
}

export class RealtimeError extends ChatError {
  constructor(message: string, public originalError?: any) {
    super(message, 'REALTIME_ERROR', 500)
    this.name = 'RealtimeError'
  }
}

/**
 * Handle and log errors consistently
 */
export function handleError(error: unknown, context?: string): ChatError {
  console.error(`Error in ${context || 'unknown context'}:`, error)
  
  if (error instanceof ChatError) {
    return error
  }
  
  if (error instanceof Error) {
    return new ChatError(error.message, 'UNKNOWN_ERROR')
  }
  
  return new ChatError('An unknown error occurred', 'UNKNOWN_ERROR')
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}