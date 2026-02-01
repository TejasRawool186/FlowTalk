// OpenAI Translation Service for Romanized Language Translation
// Uses OpenAI's GPT models for semantic translation of romanized text

import { LanguageCode } from '@/types'
import { TranslationError } from '@/lib/errors'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface TranslationResult {
    translatedText: string
    detectedLanguage: string
    isRomanized: boolean
    confidence: number
}

// Singleton instance
let openaiServiceInstance: OpenAITranslationService | null = null

export class OpenAITranslationService {
    private apiKey: string

    constructor() {
        this.apiKey = OPENAI_API_KEY
    }

    /**
     * Check if the service is available (API key configured)
     */
    isAvailable(): boolean {
        return !!this.apiKey && this.apiKey.length > 0
    }

    /**
     * Translate romanized text using OpenAI GPT
     */
    async translateRomanized(
        content: string,
        targetLanguage: LanguageCode,
        protectedTerms: string[] = []
    ): Promise<TranslationResult> {
        if (!this.isAvailable()) {
            throw new TranslationError('OpenAI API key not configured', 'API_KEY_MISSING')
        }

        const protectedTermsList = protectedTerms.length > 0
            ? `\nProtected terms (keep unchanged): ${protectedTerms.join(', ')}`
            : ''

        const languageNames: Record<string, string> = {
            'en': 'English',
            'hi': 'Hindi',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'ru': 'Russian',
            'pt': 'Portuguese',
            'it': 'Italian',
            'ko': 'Korean'
        }

        const targetLangName = languageNames[targetLanguage] || targetLanguage

        const systemPrompt = `You are a professional translator. Your task is to:
1. Detect if the input text is in romanized form (e.g., "aap kaise hai" is romanized Hindi)
2. Translate the text to ${targetLangName}
3. Preserve proper nouns, brand names, and technical terms exactly as written
4. For romanized text, understand the semantic meaning, not just transliterate
${protectedTermsList}

Respond ONLY with a JSON object in this exact format:
{
  "translatedText": "the translated text here",
  "detectedLanguage": "detected language code (en, hi, es, fr, de, ja, zh, ar, ru, pt, it, ko)",
  "isRomanized": true or false,
  "confidence": 0.0 to 1.0
}`

        const userPrompt = `Translate to ${targetLangName}: "${content}"`

        try {
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new TranslationError(
                    `OpenAI API error: ${response.status}`,
                    JSON.stringify(errorData)
                )
            }

            const data = await response.json()
            const messageContent = data.choices?.[0]?.message?.content || ''

            // Parse the JSON response
            try {
                // Extract JSON from the response (handle markdown code blocks)
                let jsonStr = messageContent
                if (messageContent.includes('```')) {
                    const match = messageContent.match(/```(?:json)?\s*([\s\S]*?)```/)
                    if (match) jsonStr = match[1]
                }

                const result = JSON.parse(jsonStr.trim())
                return {
                    translatedText: result.translatedText || content,
                    detectedLanguage: result.detectedLanguage || 'en',
                    isRomanized: result.isRomanized || false,
                    confidence: result.confidence || 0.8
                }
            } catch {
                // If JSON parsing fails, try to extract just the translation
                console.warn('Failed to parse OpenAI response as JSON, using raw text')
                return {
                    translatedText: messageContent.trim(),
                    detectedLanguage: 'unknown',
                    isRomanized: false,
                    confidence: 0.5
                }
            }
        } catch (error) {
            if (error instanceof TranslationError) throw error

            throw new TranslationError(
                `OpenAI translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'OPENAI_ERROR'
            )
        }
    }

    /**
     * Detect the language of romanized text
     */
    async detectRomanizedLanguage(content: string): Promise<{
        language: string
        isRomanized: boolean
        confidence: number
    }> {
        if (!this.isAvailable()) {
            return { language: 'en', isRomanized: false, confidence: 0.5 }
        }

        try {
            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `Detect the language of the given text. If it's written in romanized form (Latin script but not English), identify the actual language.
Respond ONLY with JSON: {"language": "code", "isRomanized": true/false, "confidence": 0.0-1.0}
Language codes: en, hi, es, fr, de, ja, zh, ar, ru, pt, it, ko`
                        },
                        { role: 'user', content: `Detect language: "${content}"` }
                    ],
                    temperature: 0.1,
                    max_tokens: 100
                })
            })

            if (!response.ok) {
                return { language: 'en', isRomanized: false, confidence: 0.5 }
            }

            const data = await response.json()
            const messageContent = data.choices?.[0]?.message?.content || ''

            try {
                let jsonStr = messageContent
                if (messageContent.includes('```')) {
                    const match = messageContent.match(/```(?:json)?\s*([\s\S]*?)```/)
                    if (match) jsonStr = match[1]
                }

                const result = JSON.parse(jsonStr.trim())
                return {
                    language: result.language || 'en',
                    isRomanized: result.isRomanized || false,
                    confidence: result.confidence || 0.7
                }
            } catch {
                return { language: 'en', isRomanized: false, confidence: 0.5 }
            }
        } catch {
            return { language: 'en', isRomanized: false, confidence: 0.5 }
        }
    }
}

/**
 * Get singleton instance of OpenAITranslationService
 */
export function getOpenAITranslationService(): OpenAITranslationService {
    if (!openaiServiceInstance) {
        openaiServiceInstance = new OpenAITranslationService()
    }
    return openaiServiceInstance
}
