// Utility functions for the multilingual chat system

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a hash for cache keys
 */
export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Check if a string contains code blocks (marked with backticks)
 */
export function hasCodeBlocks(content: string): boolean {
  return /```[\s\S]*?```|`[^`\n]+`/.test(content)
}

/**
 * Extract code blocks from content
 */
export function extractCodeBlocks(content: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```|`[^`\n]+`/g
  return content.match(codeBlockRegex) || []
}

/**
 * Replace code blocks with placeholders for translation
 */
export function replaceCodeBlocksWithPlaceholders(content: string): { content: string; placeholders: Map<string, string> } {
  const placeholders = new Map<string, string>()
  let counter = 0
  
  const processedContent = content.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    const placeholder = `__CODE_BLOCK_${counter}__`
    placeholders.set(placeholder, match)
    counter++
    return placeholder
  })
  
  return { content: processedContent, placeholders }
}

/**
 * Restore code blocks from placeholders after translation
 */
export function restoreCodeBlocks(content: string, placeholders: Map<string, string>): string {
  let restoredContent = content
  
  placeholders.forEach((originalCode, placeholder) => {
    restoredContent = restoredContent.replace(placeholder, originalCode)
  })
  
  return restoredContent
}

/**
 * Check if content is primarily in a specific language (basic heuristic)
 */
export function isPrimaryLanguage(content: string, languageCode: string): boolean {
  // This is a simplified heuristic - in a real implementation,
  // you'd use a proper language detection library
  const commonWords: Record<string, string[]> = {
    'en': ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'],
    'es': ['el', 'la', 'y', 'o', 'pero', 'en', 'con', 'por', 'para', 'de', 'que', 'se'],
    'fr': ['le', 'la', 'et', 'ou', 'mais', 'dans', 'sur', 'à', 'pour', 'de', 'avec', 'par'],
    'de': ['der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'auf', 'zu', 'für', 'von', 'mit'],
  }
  
  const words = content.toLowerCase().split(/\s+/)
  const languageWords = commonWords[languageCode] || []
  
  if (languageWords.length === 0) return false
  
  const matches = words.filter(word => languageWords.includes(word)).length
  return matches / words.length > 0.1 // At least 10% common words
}

/**
 * Sanitize content for safe display
 */
export function sanitizeContent(content: string): string {
  // Basic sanitization - in production, use a proper sanitization library
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: Date): string {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'just now'
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }
  
  // More than 24 hours
  return timestamp.toLocaleDateString()
}

/**
 * Validate language code format
 */
export function isValidLanguageCode(code: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(code)
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID()
}