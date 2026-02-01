// Gemini AI Translation Service for Romanized Language Translation
// Uses Google's Gemini API for semantic translation of romanized text

import { LanguageCode } from '@/types'
import { TranslationError, handleError } from '@/lib/errors'

export interface GeminiTranslationResult {
  translatedText: string
  detectedLanguage: LanguageCode
  isRomanized: boolean
  confidence: number
  preservedTerms: string[]
}

export interface RomanizedDetectionResult {
  isRomanized: boolean
  originalLanguage: LanguageCode
  normalizedText: string
  confidence: number
}

export class GeminiTranslationService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables')
    }
  }

  /**
   * Translate romanized text to target language with semantic understanding
   */
  async translateRomanized(
    content: string,
    targetLanguage: LanguageCode,
    preserveTerms: string[] = []
  ): Promise<GeminiTranslationResult> {
    try {
      if (!this.apiKey) {
        throw new TranslationError('Gemini API key not configured')
      }

      if (!content.trim()) {
        return {
          translatedText: content,
          detectedLanguage: 'en',
          isRomanized: false,
          confidence: 1,
          preservedTerms: []
        }
      }

      const preserveList = preserveTerms.length > 0
        ? `\n\nIMPORTANT: Do NOT translate these terms, keep them exactly as-is: ${preserveTerms.join(', ')}`
        : ''

      const targetLangName = this.getLanguageName(targetLanguage)

      const prompt = `You are a specialized translation assistant for romanized/transliterated languages.

TASK: Translate the following message to ${targetLangName}.

INPUT: "${content}"

RULES:
1. Detect if the input is romanized text (native language written in English/Roman letters)
2. Common romanized languages: Hinglish (Hindi in Roman), Tanglish (Tamil in Roman), etc.
3. Translate the SEMANTIC MEANING, not literal word-by-word
4. Preserve natural sentence structure in the target language
5. If the text contains proper nouns (names, brands, apps), keep them unchanged${preserveList}

RESPOND IN THIS EXACT JSON FORMAT ONLY:
{
  "translatedText": "the translation here",
  "detectedLanguage": "language code (hi, ta, bn, en, etc.)",
  "isRomanized": true/false,
  "confidence": 0.0 to 1.0
}

Only output the JSON, no other text.`

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new TranslationError(
          `Gemini API error: ${response.status}`,
          JSON.stringify(errorData)
        )
      }

      const data = await response.json()
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!textContent) {
        throw new TranslationError('Empty response from Gemini API')
      }

      // Parse JSON response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('Gemini returned non-JSON response, using raw text')
        return {
          translatedText: textContent.trim(),
          detectedLanguage: 'en',
          isRomanized: false,
          confidence: 0.5,
          preservedTerms: preserveTerms
        }
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        translatedText: parsed.translatedText || content,
        detectedLanguage: parsed.detectedLanguage || 'en',
        isRomanized: parsed.isRomanized ?? false,
        confidence: parsed.confidence ?? 0.8,
        preservedTerms: preserveTerms
      }

    } catch (error) {
      if (error instanceof TranslationError) {
        throw error
      }
      throw handleError(error, 'GeminiTranslationService.translateRomanized')
    }
  }

  /**
   * Detect if content is romanized and identify the original language
   */
  async detectRomanizedLanguage(content: string): Promise<RomanizedDetectionResult> {
    try {
      if (!this.apiKey) {
        throw new TranslationError('Gemini API key not configured')
      }

      if (!content.trim()) {
        return {
          isRomanized: false,
          originalLanguage: 'en',
          normalizedText: content,
          confidence: 1
        }
      }

      const prompt = `Analyze this text and determine if it's romanized/transliterated:

TEXT: "${content}"

Romanized text = Native language written using English/Roman letters
Examples:
- "muje aapki help chahiye" → Hindi (Romanized)
- "naan oru developer" → Tamil (Romanized)
- "ami tomake bhalobashi" → Bengali (Romanized)

RESPOND IN THIS EXACT JSON FORMAT ONLY:
{
  "isRomanized": true/false,
  "originalLanguage": "language code (hi=Hindi, ta=Tamil, bn=Bengali, en=English, etc.)",
  "normalizedText": "text converted to native script if romanized, otherwise same as input",
  "confidence": 0.0 to 1.0
}

Only output the JSON, no other text.`

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          }
        })
      })

      if (!response.ok) {
        throw new TranslationError(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!textContent) {
        throw new TranslationError('Empty response from Gemini API')
      }

      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return {
          isRomanized: false,
          originalLanguage: 'en',
          normalizedText: content,
          confidence: 0.5
        }
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        isRomanized: parsed.isRomanized ?? false,
        originalLanguage: parsed.originalLanguage || 'en',
        normalizedText: parsed.normalizedText || content,
        confidence: parsed.confidence ?? 0.8
      }

    } catch (error) {
      console.error('Gemini romanized detection failed:', error)
      return {
        isRomanized: false,
        originalLanguage: 'en',
        normalizedText: content,
        confidence: 0.3
      }
    }
  }

  /**
   * Get language display name from code
   */
  private getLanguageName(code: LanguageCode): string {
    const names: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
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
      'ta': 'Tamil',
      'bn': 'Bengali',
      'te': 'Telugu',
      'mr': 'Marathi'
    }
    return names[code] || code
  }

  /**
   * Check if Gemini API is available
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }
}

// Singleton instance
let geminiServiceInstance: GeminiTranslationService | null = null

export function getGeminiTranslationService(): GeminiTranslationService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiTranslationService()
  }
  return geminiServiceInstance
}
