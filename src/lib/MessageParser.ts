// Message Content Parser with Markdown support and validation
// Handles parsing, validation, and formatting of chat messages
//
// Integration with Translation System:
// 1. Parse message content to identify code blocks and inline code
// 2. Extract translatable content (text without code) using getTranslatableContent()
// 3. Send translatable content through translation API
// 4. Restore code blocks and inline code in translated content using restoreCodeInTranslation()
//
// This ensures that code remains unchanged during translation while allowing
// natural language text to be properly translated.

import { ValidationError, handleError } from './errors'

export interface ParsedMessage {
  content: string
  hasCodeBlocks: boolean
  hasInlineCode: boolean
  hasMarkdown: boolean
  codeBlocks: CodeBlock[]
  inlineCodeSpans: string[]
  plainText: string
  isValid: boolean
  errors: string[]
}

export interface CodeBlock {
  language?: string
  code: string
  startIndex: number
  endIndex: number
}

export interface MessageGrammar {
  maxLength: number
  allowedElements: string[]
  forbiddenPatterns: RegExp[]
}

export class MessageParser {
  private readonly grammar: MessageGrammar

  constructor(grammar?: Partial<MessageGrammar>) {
    this.grammar = {
      maxLength: 4000,
      allowedElements: ['**', '*', '`', '```', '\n', '_', '~~'],
      forbiddenPatterns: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, // Iframe tags
        /javascript:/gi, // JavaScript URLs
        /data:text\/html/gi, // Data URLs
      ],
      ...grammar
    }
  }

  /**
   * Parse message content and extract structure
   */
  parse(content: string): ParsedMessage {
    try {
      if (!content) {
        return this.createEmptyResult('Content is required')
      }

      // Validate content length
      if (content.length > this.grammar.maxLength) {
        return this.createEmptyResult(`Content exceeds maximum length of ${this.grammar.maxLength} characters`)
      }

      // Check for forbidden patterns
      const forbiddenErrors = this.validateForbiddenPatterns(content)
      if (forbiddenErrors.length > 0) {
        return this.createEmptyResult(forbiddenErrors.join(', '))
      }

      // Extract code blocks first
      const { content: contentWithoutCodeBlocks, codeBlocks } = this.extractCodeBlocks(content)
      
      // Extract inline code spans
      const { content: contentWithoutInlineCode, inlineCodeSpans } = this.extractInlineCode(contentWithoutCodeBlocks)
      
      // Get plain text (content without any markdown)
      const plainText = this.extractPlainText(contentWithoutInlineCode)
      
      // Check for markdown formatting
      const hasMarkdown = this.hasMarkdownFormatting(contentWithoutInlineCode)

      return {
        content,
        hasCodeBlocks: codeBlocks.length > 0,
        hasInlineCode: inlineCodeSpans.length > 0,
        hasMarkdown,
        codeBlocks,
        inlineCodeSpans,
        plainText,
        isValid: true,
        errors: []
      }
    } catch (error) {
      return this.createEmptyResult(`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate message content against grammar rules
   */
  validate(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!content || content.trim().length === 0) {
      errors.push('Message content cannot be empty')
    }

    if (content.length > this.grammar.maxLength) {
      errors.push(`Message exceeds maximum length of ${this.grammar.maxLength} characters`)
    }

    // Check forbidden patterns
    const forbiddenErrors = this.validateForbiddenPatterns(content)
    errors.push(...forbiddenErrors)

    // Validate markdown syntax
    const markdownErrors = this.validateMarkdownSyntax(content)
    errors.push(...markdownErrors)

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Format parsed content for display
   */
  format(parsedMessage: ParsedMessage): string {
    if (!parsedMessage.isValid) {
      return parsedMessage.content
    }

    // For now, return the original content
    // In a full implementation, this would apply formatting rules
    return parsedMessage.content
  }

  /**
   * Extract code blocks from content
   */
  private extractCodeBlocks(content: string): { content: string; codeBlocks: CodeBlock[] } {
    const codeBlocks: CodeBlock[] = []
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g
    let match
    let processedContent = content

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || undefined
      const code = match[2].trim() // Trim whitespace from code content
      const startIndex = match.index
      const endIndex = match.index + match[0].length

      codeBlocks.push({
        language,
        code,
        startIndex,
        endIndex
      })
    }

    // Remove code blocks from content for further processing
    processedContent = content.replace(codeBlockRegex, '')

    return { content: processedContent, codeBlocks }
  }

  /**
   * Extract inline code spans from content
   */
  private extractInlineCode(content: string): { content: string; inlineCodeSpans: string[] } {
    const inlineCodeSpans: string[] = []
    const inlineCodeRegex = /`([^`\n]+)`/g
    let match
    let processedContent = content

    while ((match = inlineCodeRegex.exec(content)) !== null) {
      inlineCodeSpans.push(match[1])
    }

    // Remove inline code from content for further processing
    processedContent = content.replace(inlineCodeRegex, '')

    return { content: processedContent, inlineCodeSpans }
  }

  /**
   * Extract plain text by removing all markdown formatting
   */
  private extractPlainText(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1') // Italic
      .replace(/_(.*?)_/g, '$1') // Italic underscore
      .replace(/~~(.*?)~~/g, '$1') // Strikethrough
      .replace(/\n+/g, ' ') // Multiple newlines to space
      .trim()
  }

  /**
   * Check if content has markdown formatting
   */
  private hasMarkdownFormatting(content: string): boolean {
    const markdownPatterns = [
      /\*\*.*?\*\*/, // Bold
      /\*.*?\*/, // Italic
      /_.*?_/, // Italic underscore
      /~~.*?~~/, // Strikethrough
      /^#{1,6}\s/, // Headers
      /^\s*[-*+]\s/, // Lists
      /^\s*\d+\.\s/, // Numbered lists
      /^\s*>\s/, // Blockquotes
    ]

    return markdownPatterns.some(pattern => pattern.test(content))
  }

  /**
   * Validate forbidden patterns
   */
  private validateForbiddenPatterns(content: string): string[] {
    const errors: string[] = []

    for (const pattern of this.grammar.forbiddenPatterns) {
      if (pattern.test(content)) {
        errors.push(`Content contains forbidden pattern: ${pattern.source}`)
      }
    }

    return errors
  }

  /**
   * Validate markdown syntax
   */
  private validateMarkdownSyntax(content: string): string[] {
    const errors: string[] = []

    // Check for unmatched markdown delimiters
    const boldMatches = (content.match(/\*\*/g) || []).length
    if (boldMatches % 2 !== 0) {
      errors.push('Unmatched bold markdown delimiters (**)') 
    }

    const italicMatches = (content.match(/(?<!\*)\*(?!\*)/g) || []).length
    if (italicMatches % 2 !== 0) {
      errors.push('Unmatched italic markdown delimiters (*)')
    }

    const underscoreMatches = (content.match(/(?<!_)_(?!_)/g) || []).length
    if (underscoreMatches % 2 !== 0) {
      errors.push('Unmatched italic markdown delimiters (_)')
    }

    const strikethroughMatches = (content.match(/~~/g) || []).length
    if (strikethroughMatches % 2 !== 0) {
      errors.push('Unmatched strikethrough markdown delimiters (~~)')
    }

    // Check for unmatched code blocks
    const codeBlockMatches = (content.match(/```/g) || []).length
    if (codeBlockMatches % 2 !== 0) {
      errors.push('Unmatched code block delimiters (```)')
    }

    // Check for unmatched inline code
    const inlineCodeMatches = (content.match(/`/g) || []).length
    const codeBlockBackticks = (content.match(/```/g) || []).length * 3
    const actualInlineBackticks = inlineCodeMatches - codeBlockBackticks
    
    if (actualInlineBackticks % 2 !== 0) {
      errors.push('Unmatched inline code delimiters (`)')
    }

    return errors
  }

  /**
   * Create empty result with error
   */
  private createEmptyResult(error: string): ParsedMessage {
    return {
      content: '',
      hasCodeBlocks: false,
      hasInlineCode: false,
      hasMarkdown: false,
      codeBlocks: [],
      inlineCodeSpans: [],
      plainText: '',
      isValid: false,
      errors: [error]
    }
  }

  /**
   * Get content with code blocks replaced by placeholders
   */
  getContentWithCodePlaceholders(parsedMessage: ParsedMessage): string {
    if (!parsedMessage.hasCodeBlocks) {
      return parsedMessage.content
    }

    let content = parsedMessage.content
    parsedMessage.codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`
      const originalBlock = parsedMessage.content.substring(block.startIndex, block.endIndex)
      content = content.replace(originalBlock, placeholder)
    })

    return content
  }

  /**
   * Restore code blocks from placeholders
   */
  restoreCodeBlocks(content: string, parsedMessage: ParsedMessage): string {
    if (!parsedMessage.hasCodeBlocks) {
      return content
    }

    let restoredContent = content
    parsedMessage.codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`
      const originalBlock = block.language 
        ? `\`\`\`${block.language}\n${block.code}\`\`\``
        : `\`\`\`\n${block.code}\`\`\``
      restoredContent = restoredContent.replace(placeholder, originalBlock)
    })

    return restoredContent
  }

  /**
   * Check if content is primarily code
   */
  isPrimarilyCode(parsedMessage: ParsedMessage): boolean {
    if (!parsedMessage.hasCodeBlocks && !parsedMessage.hasInlineCode) {
      return false
    }

    const totalLength = parsedMessage.content.length
    const codeLength = parsedMessage.codeBlocks.reduce((sum, block) => sum + block.code.length, 0) +
                     parsedMessage.inlineCodeSpans.reduce((sum, span) => sum + span.length, 0)

    return codeLength / totalLength > 0.5 // More than 50% is code
  }

  /**
   * Get content suitable for translation (without code blocks)
   */
  getTranslatableContent(parsedMessage: ParsedMessage): string {
    if (!parsedMessage.isValid) {
      return parsedMessage.content
    }

    // Start with content that has code blocks replaced with placeholders
    let translatableContent = this.getContentWithCodePlaceholders(parsedMessage)

    // Also replace inline code with placeholders
    parsedMessage.inlineCodeSpans.forEach((span, index) => {
      const placeholder = `__INLINE_CODE_${index}__`
      translatableContent = translatableContent.replace(`\`${span}\``, placeholder)
    })

    return translatableContent
  }

  /**
   * Restore all code elements from placeholders
   */
  restoreAllCode(content: string, parsedMessage: ParsedMessage): string {
    let restoredContent = content

    // Restore code blocks
    restoredContent = this.restoreCodeBlocks(restoredContent, parsedMessage)

    // Restore inline code
    parsedMessage.inlineCodeSpans.forEach((span, index) => {
      const placeholder = `__INLINE_CODE_${index}__`
      restoredContent = restoredContent.replace(placeholder, `\`${span}\``)
    })

    return restoredContent
  }
}

// Default parser instance
export const messageParser = new MessageParser()

// Utility functions for common operations
export function parseMessage(content: string): ParsedMessage {
  return messageParser.parse(content)
}

export function validateMessage(content: string): { isValid: boolean; errors: string[] } {
  return messageParser.validate(content)
}

export function formatMessage(parsedMessage: ParsedMessage): string {
  return messageParser.format(parsedMessage)
}

export function getTranslatableContent(content: string): { translatableContent: string; parsedMessage: ParsedMessage } {
  const parsedMessage = parseMessage(content)
  const translatableContent = messageParser.getTranslatableContent(parsedMessage)
  return { translatableContent, parsedMessage }
}

export function restoreCodeInTranslation(translatedContent: string, originalParsedMessage: ParsedMessage): string {
  return messageParser.restoreAllCode(translatedContent, originalParsedMessage)
}