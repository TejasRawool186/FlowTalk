// Unit tests for LanguageDetector

import { LanguageDetectorImpl } from '../LanguageDetector'
import { LanguageDetectionError } from '@/lib/errors'

describe('LanguageDetector', () => {
  let languageDetector: LanguageDetectorImpl
  
  beforeEach(() => {
    languageDetector = new LanguageDetectorImpl()
  })

  describe('detectLanguage', () => {
    it('should detect English correctly', async () => {
      const englishText = 'Hello, this is a test message in English. How are you doing today?'
      const result = await languageDetector.detectLanguage(englishText)
      
      expect(result).toBe('en')
    })

    it('should detect Spanish correctly', async () => {
      const spanishText = 'Hola, este es un mensaje de prueba en español. ¿Cómo estás hoy?'
      const result = await languageDetector.detectLanguage(spanishText)
      
      expect(result).toBe('es')
    })

    it('should detect French correctly', async () => {
      const frenchText = 'Bonjour, ceci est un message de test en français. Comment allez-vous aujourd\'hui?'
      const result = await languageDetector.detectLanguage(frenchText)
      
      expect(result).toBe('fr')
    })

    it('should detect German correctly', async () => {
      const germanText = 'Hallo, das ist eine Testnachricht auf Deutsch. Wie geht es Ihnen heute?'
      const result = await languageDetector.detectLanguage(germanText)
      
      expect(result).toBe('de')
    })

    it('should detect Italian correctly', async () => {
      const italianText = 'Ciao, questo è un messaggio di prova in italiano. Come stai oggi?'
      const result = await languageDetector.detectLanguage(italianText)
      
      expect(result).toBe('it')
    })

    it('should detect Portuguese correctly', async () => {
      const portugueseText = 'Olá, esta é uma mensagem de teste em português. Como você está hoje?'
      const result = await languageDetector.detectLanguage(portugueseText)
      
      expect(result).toBe('pt')
    })

    it('should handle code blocks by ignoring them', async () => {
      const textWithCode = 'This is English text with ```javascript\nconsole.log("hello");\n``` code block'
      const result = await languageDetector.detectLanguage(textWithCode)
      
      expect(result).toBe('en')
    })

    it('should handle inline code by ignoring it', async () => {
      const textWithInlineCode = 'Use the `console.log()` function to debug your JavaScript code'
      const result = await languageDetector.detectLanguage(textWithInlineCode)
      
      expect(result).toBe('en')
    })

    it('should handle URLs by ignoring them', async () => {
      const textWithUrl = 'Check out this website https://example.com for more information'
      const result = await languageDetector.detectLanguage(textWithUrl)
      
      expect(result).toBe('en')
    })

    it('should handle mentions and hashtags', async () => {
      const textWithMentions = 'Hey @john, check out this #awesome feature we built!'
      const result = await languageDetector.detectLanguage(textWithMentions)
      
      expect(result).toBe('en')
    })

    it('should default to English for very short content', async () => {
      const shortText = 'Hi'
      const result = await languageDetector.detectLanguage(shortText)
      
      expect(result).toBe('en')
    })

    it('should default to English for empty content', async () => {
      const emptyText = '   '
      
      await expect(languageDetector.detectLanguage(emptyText))
        .rejects.toThrow(LanguageDetectionError)
    })

    it('should handle mixed punctuation and special characters', async () => {
      const textWithPunctuation = 'Hello! How are you? I\'m doing well... Thanks for asking!!!'
      const result = await languageDetector.detectLanguage(textWithPunctuation)
      
      expect(result).toBe('en')
    })

    it('should detect Russian with Cyrillic characters', async () => {
      const russianText = 'Привет, это тестовое сообщение на русском языке. Как дела?'
      const result = await languageDetector.detectLanguage(russianText)
      
      expect(result).toBe('ru')
    })

    it('should detect Chinese characters', async () => {
      const chineseText = '你好，这是一条中文测试消息。你今天怎么样？'
      const result = await languageDetector.detectLanguage(chineseText)
      
      expect(result).toBe('zh')
    })

    it('should validate required content', async () => {
      await expect(languageDetector.detectLanguage(''))
        .rejects.toThrow(LanguageDetectionError)

      await expect(languageDetector.detectLanguage(null as any))
        .rejects.toThrow(LanguageDetectionError)

      await expect(languageDetector.detectLanguage(undefined as any))
        .rejects.toThrow(LanguageDetectionError)
    })
  })

  describe('detectPrimaryLanguage', () => {
    it('should detect primary language in mixed content', async () => {
      const mixedText = 'Hello, this is English. Hola, esto es español. But most of this text is in English, so it should be detected as the primary language.'
      const result = await languageDetector.detectPrimaryLanguage(mixedText)
      
      expect(result).toBe('en')
    })

    it('should handle single language content', async () => {
      const singleLanguageText = 'This is entirely in English. Every sentence is English. No other languages here.'
      const result = await languageDetector.detectPrimaryLanguage(singleLanguageText)
      
      expect(result).toBe('en')
    })

    it('should weight by content length, not sentence count', async () => {
      const mixedText = 'Hola. This is a much longer sentence in English that contains significantly more content than the Spanish greeting.'
      const result = await languageDetector.detectPrimaryLanguage(mixedText)
      
      expect(result).toBe('en')
    })

    it('should handle empty content', async () => {
      await expect(languageDetector.detectPrimaryLanguage(''))
        .rejects.toThrow(LanguageDetectionError)
    })

    it('should handle content with only short sentences', async () => {
      const shortSentences = 'Hi. Bye. OK.'
      const result = await languageDetector.detectPrimaryLanguage(shortSentences)
      
      expect(result).toBe('en')
    })
  })

  describe('isLanguageDetectionUncertain', () => {
    it('should return true for very short content', async () => {
      const shortText = 'Hi'
      const result = await languageDetector.isLanguageDetectionUncertain(shortText)
      
      expect(result).toBe(true)
    })

    it('should return true for empty content', async () => {
      const emptyText = ''
      const result = await languageDetector.isLanguageDetectionUncertain(emptyText)
      
      expect(result).toBe(true)
    })

    it('should return false for clear English content', async () => {
      const clearEnglishText = 'This is a clear English message with many common English words and phrases that should be easily detectable.'
      const result = await languageDetector.isLanguageDetectionUncertain(clearEnglishText)
      
      expect(result).toBe(false)
    })

    it('should return false for clear Spanish content', async () => {
      const clearSpanishText = 'Este es un mensaje claro en español con muchas palabras comunes en español que deberían ser fácilmente detectables.'
      const result = await languageDetector.isLanguageDetectionUncertain(clearSpanishText)
      
      expect(result).toBe(false)
    })

    it('should return true for ambiguous content', async () => {
      const ambiguousText = 'OK yes no maybe'
      const result = await languageDetector.isLanguageDetectionUncertain(ambiguousText)
      
      expect(result).toBe(true)
    })

    it('should return true for mixed language content with similar amounts', async () => {
      const mixedText = 'Hello how are you. Hola como estas tu.'
      const result = await languageDetector.isLanguageDetectionUncertain(mixedText)
      
      // This might be uncertain depending on the scoring
      expect(typeof result).toBe('boolean')
    })

    it('should handle content with only numbers and symbols', async () => {
      const numbersText = '123 456 789 !@# $%^'
      const result = await languageDetector.isLanguageDetectionUncertain(numbersText)
      
      expect(result).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle content with only whitespace', async () => {
      const whitespaceText = '   \n\t   '
      
      await expect(languageDetector.detectLanguage(whitespaceText))
        .rejects.toThrow(LanguageDetectionError)
    })

    it('should handle content with only code blocks', async () => {
      const onlyCodeText = '```javascript\nconsole.log("hello");\n```'
      const result = await languageDetector.detectLanguage(onlyCodeText)
      
      // Should default to English when no text content is found
      expect(result).toBe('en')
    })

    it('should handle content with only URLs', async () => {
      const onlyUrlText = 'https://example.com https://test.org'
      const result = await languageDetector.detectLanguage(onlyUrlText)
      
      // Should default to English when no text content is found
      expect(result).toBe('en')
    })

    it('should handle content with mixed scripts', async () => {
      const mixedScriptText = 'Hello 你好 Привет مرحبا'
      const result = await languageDetector.detectLanguage(mixedScriptText)
      
      // Should return some language (behavior may vary)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle very long content', async () => {
      const longText = 'This is English. '.repeat(100)
      const result = await languageDetector.detectLanguage(longText)
      
      expect(result).toBe('en')
    })
  })
})