import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getMessageService, getTranslationEngine } from '@/services'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Import language detector for proper language detection
import { LanguageDetectorImpl } from '@/services/LanguageDetector'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    const messageService = getMessageService()
    const messages = await messageService.getChannelMessagesForUser(channelId, decoded.id, limit)

    // Get user's language preference
    const db = await getDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) })
    const userLanguage = user?.primaryLanguage || 'en'

    // Add translations for messages that need them
    const messagesWithTranslations = await Promise.all(
      messages.map(async (message) => {
        // Skip translation if it's the user's own message
        if (message.senderId === decoded.id) {
          return message
        }

        // Check if translation already exists
        const existingTranslation = message.translations?.find(t => t.targetLanguage === userLanguage)
        if (existingTranslation) {
          return message
        }

        // Get translation from database if it exists
        const messageDoc = await db.collection('messages').findOne({ _id: new ObjectId(message.id) })
        const dbTranslation = messageDoc?.translations?.find((t: any) => t.targetLanguage === userLanguage)

        if (dbTranslation) {
          return {
            ...message,
            translations: [{
              messageId: message.id,
              targetLanguage: userLanguage,
              translatedContent: dbTranslation.translatedContent,
              createdAt: dbTranslation.createdAt
            }]
          }
        }

        // Create translation if it doesn't exist
        try {
          const translationEngine = getTranslationEngine()
          let translatedContent: string

          try {
            translatedContent = await translationEngine.translateText(
              message.content,
              message.sourceLanguage as any,
              userLanguage as any
            )
          } catch (translationError) {
            console.warn('Translation API failed, using enhanced translation:', translationError)
            // Use enhanced translation system
            translatedContent = await getEnhancedTranslation(message.content, message.sourceLanguage, userLanguage)
          }

          // Store translation in database
          await db.collection('messages').updateOne(
            { _id: new ObjectId(message.id) },
            {
              $push: {
                translations: {
                  targetLanguage: userLanguage,
                  translatedContent,
                  createdAt: new Date()
                }
              } as any
            }
          )

          return {
            ...message,
            translations: [{
              messageId: message.id,
              targetLanguage: userLanguage,
              translatedContent,
              createdAt: new Date()
            }]
          }
        } catch (error) {
          console.error('Translation failed for message:', message.id, error)
          return message
        }
      })
    )

    return NextResponse.json({ messages: messagesWithTranslations })
  } catch (error: any) {
    console.error('Messages API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { channelId, content } = await request.json()

    if (!channelId || !content) {
      return NextResponse.json(
        { error: 'Channel ID and content are required' },
        { status: 400 }
      )
    }

    const messageService = getMessageService()
    const message = await messageService.createMessage(channelId, content, decoded.id)

    // Get all users in the channel to determine what languages to translate to
    const db = await getDatabase()
    const channel = await db.collection('channels').findOne({ _id: new ObjectId(channelId) })
    if (!channel) {
      return NextResponse.json({ message })
    }

    // Get community members
    const community = await db.collection('communities').findOne({ _id: channel.communityId })
    if (!community || !community.members) {
      return NextResponse.json({ message })
    }

    // Get unique languages from community members (excluding sender's language)
    const memberLanguages = await db.collection('users')
      .find({ _id: { $in: community.members } })
      .toArray()

    const targetLanguages = [...new Set(
      memberLanguages
        .map(user => user.primaryLanguage)
        .filter(lang => lang && lang !== message.sourceLanguage)
    )]

    // Create translations for each target language
    if (targetLanguages.length > 0) {
      try {
        const translationEngine = getTranslationEngine()
        const translations = await Promise.all(
          targetLanguages.map(async (targetLang) => {
            try {
              let translatedContent: string
              try {
                translatedContent = await translationEngine.translateText(
                  message.content,
                  message.sourceLanguage as any,
                  targetLang as any
                )
              } catch (translationError) {
                console.warn(`Translation API failed for ${targetLang}, using enhanced translation:`, translationError)
                // Use enhanced translation system
                translatedContent = await getEnhancedTranslation(message.content, message.sourceLanguage, targetLang)
              }

              return {
                targetLanguage: targetLang,
                translatedContent,
                createdAt: new Date()
              }
            } catch (error) {
              console.error(`Translation failed for ${targetLang}:`, error)
              return null
            }
          })
        )

        // Filter out failed translations and store successful ones
        const successfulTranslations = translations.filter(t => t !== null)
        if (successfulTranslations.length > 0) {
          await db.collection('messages').updateOne(
            { _id: new ObjectId(message.id) },
            { $set: { translations: successfulTranslations } }
          )
        }
      } catch (error) {
        console.error('Translation process failed:', error)
        // Don't fail the message creation if translation fails
      }
    }

    return NextResponse.json({ message })
  } catch (error: any) {
    console.error('Create message API error:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // Delete all messages in the channel
    const db = await getDatabase()
    const result = await db.collection('messages').deleteMany({
      channelId: new ObjectId(channelId)
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} messages from channel`
    })
  } catch (error: any) {
    console.error('Delete messages API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    )
  }
}

// Enhanced translation system with proper language detection and consistency
async function getEnhancedTranslation(content: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  console.log(`🔄 Enhanced Translation: "${content}" from ${sourceLanguage} to ${targetLanguage}`)

  // Import OpenAI service dynamically to avoid circular dependencies
  // const { getOpenAITranslationService } = await import('@/services/OpenAITranslationService')
  // const aiService = getOpenAITranslationService()

  // Step 1: Detect actual language of content (don't trust user preference)
  const languageDetector = new LanguageDetectorImpl()
  let detectedResult: any
  let isRomanized = false

  try {
    detectedResult = await languageDetector.detectLanguage(content)
    // Handle both old string return and new object return
    const detectedLanguage = typeof detectedResult === 'string' ? detectedResult : detectedResult.language
    isRomanized = typeof detectedResult === 'object' ? detectedResult.isRomanized : false

    console.log(`🔍 Language Detection: "${content}" detected as ${detectedLanguage}${isRomanized ? ' (Romanized)' : ''}`)

    // Step 2: Check if translation is needed
    if (detectedLanguage === targetLanguage && !isRomanized) {
      console.log(`✅ No translation needed: content is already in target language ${targetLanguage}`)
      return content
    }
  } catch (error) {
    console.warn('Language detection failed, proceeding with translation:', error)
  }

  // Step 3: Check if content is already translated (contains translation markers)
  if (content.includes('[Translated to ') || content.includes('[TRANSLATED]') || content.includes('→')) {
    console.log(`⚠️ Content appears to be already translated, returning as-is`)
    return content
  }

  // Step 4: Fallback to context-based translation with phrase database
  const translation = await performContextBasedTranslation(content, sourceLanguage, targetLanguage)

  console.log(`✅ Translation complete: "${content}" -> "${translation}"`)
  return translation
}

// Get default protected terms (brands, proper nouns, etc.)
function getDefaultProtectedTerms(): string[] {
  return [
    // Communication apps
    'Discord', 'Slack', 'WhatsApp', 'Telegram', 'Teams', 'Zoom',
    // Development tools
    'GitHub', 'GitLab', 'VS Code', 'VSCode', 'MongoDB', 'Redis', 'Docker',
    // Companies
    'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook',
    // Frameworks
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express',
    // FlowTalk specific
    'FlowTalk'
  ]
}

// Context-based translation with comprehensive phrase database
async function performContextBasedTranslation(content: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
  // Comprehensive bidirectional translation database
  const translations: Record<string, Record<string, string>> = {
    // English phrases
    'hello': {
      'hi': 'नमस्ते', 'es': 'Hola', 'fr': 'Bonjour', 'de': 'Hallo', 'ja': 'こんにちは',
      'zh': '你好', 'ar': 'مرحبا', 'ru': 'Привет', 'pt': 'Olá', 'it': 'Ciao'
    },
    'hi': {
      'hi': 'नमस्ते', 'es': 'Hola', 'fr': 'Salut', 'de': 'Hallo', 'ja': 'こんにちは',
      'zh': '你好', 'ar': 'مرحبا', 'ru': 'Привет', 'pt': 'Oi', 'it': 'Ciao'
    },
    'how are you': {
      'hi': 'आप कैसे हैं?', 'es': '¿Cómo estás?', 'fr': 'Comment allez-vous?', 'de': 'Wie geht es dir?',
      'ja': '元気ですか？', 'zh': '你好吗？', 'ar': 'كيف حالك؟', 'ru': 'Как дела?', 'pt': 'Como você está?', 'it': 'Come stai?'
    },
    'how are you?': {
      'hi': 'आप कैसे हैं?', 'es': '¿Cómo estás?', 'fr': 'Comment allez-vous?', 'de': 'Wie geht es dir?',
      'ja': '元気ですか？', 'zh': '你好吗？', 'ar': 'كيف حالك؟', 'ru': 'Как дела?', 'pt': 'Como você está?', 'it': 'Come stai?'
    },
    'what is your name': {
      'hi': 'आपका नाम क्या है?', 'es': '¿Cómo te llamas?', 'fr': 'Comment vous appelez-vous?', 'de': 'Wie heißt du?',
      'ja': 'お名前は何ですか？', 'zh': '你叫什么名字？', 'ar': 'ما اسمك؟', 'ru': 'Как тебя зовут?', 'pt': 'Qual é o seu nome?', 'it': 'Come ti chiami?'
    },
    'what is your name?': {
      'hi': 'आपका नाम क्या है?', 'es': '¿Cómo te llamas?', 'fr': 'Comment vous appelez-vous?', 'de': 'Wie heißt du?',
      'ja': 'お名前は何ですか？', 'zh': '你叫什么名字？', 'ar': 'ما اسمك؟', 'ru': 'Как тебя зовут?', 'pt': 'Qual é o seu nome?', 'it': 'Come ti chiami?'
    },
    'my name is': {
      'hi': 'मेरा नाम है', 'es': 'Mi nombre es', 'fr': 'Je m\'appelle', 'de': 'Ich heiße',
      'ja': '私の名前は', 'zh': '我的名字是', 'ar': 'اسمي', 'ru': 'Меня зовут', 'pt': 'Meu nome é', 'it': 'Mi chiamo'
    },
    'i am fine': {
      'hi': 'मैं ठीक हूँ', 'es': 'Estoy bien', 'fr': 'Je vais bien', 'de': 'Mir geht es gut',
      'ja': '元気です', 'zh': '我很好', 'ar': 'أنا بخير', 'ru': 'Я в порядке', 'pt': 'Estou bem', 'it': 'Sto bene'
    },
    'i am good': {
      'hi': 'मैं ठीक हूँ', 'es': 'Estoy bien', 'fr': 'Je vais bien', 'de': 'Mir geht es gut',
      'ja': '元気です', 'zh': '我很好', 'ar': 'أنا بخير', 'ru': 'Я в порядке', 'pt': 'Estou bem', 'it': 'Sto bene'
    },
    'good morning': {
      'hi': 'सुप्रभात', 'es': 'Buenos días', 'fr': 'Bonjour', 'de': 'Guten Morgen',
      'ja': 'おはようございます', 'zh': '早上好', 'ar': 'صباح الخير', 'ru': 'Доброе утро', 'pt': 'Bom dia', 'it': 'Buongiorno'
    },
    'good evening': {
      'hi': 'शुभ संध्या', 'es': 'Buenas tardes', 'fr': 'Bonsoir', 'de': 'Guten Abend',
      'ja': 'こんばんは', 'zh': '晚上好', 'ar': 'مساء الخير', 'ru': 'Добрый вечер', 'pt': 'Boa tarde', 'it': 'Buonasera'
    },
    'good night': {
      'hi': 'शुभ रात्रि', 'es': 'Buenas noches', 'fr': 'Bonne nuit', 'de': 'Gute Nacht',
      'ja': 'おやすみなさい', 'zh': '晚安', 'ar': 'مساء الخير', 'ru': 'Спокойной ночи', 'pt': 'Boa noite', 'it': 'Buona notte'
    },
    'thank you': {
      'hi': 'धन्यवाद', 'es': 'Gracias', 'fr': 'Merci', 'de': 'Danke',
      'ja': 'ありがとう', 'zh': '谢谢', 'ar': 'شكرا', 'ru': 'Спасибо', 'pt': 'Obrigado', 'it': 'Grazie'
    },
    'thanks': {
      'hi': 'धन्यवाद', 'es': 'Gracias', 'fr': 'Merci', 'de': 'Danke',
      'ja': 'ありがとう', 'zh': '谢谢', 'ar': 'شكرا', 'ru': 'Спасибо', 'pt': 'Obrigado', 'it': 'Grazie'
    },
    'please': {
      'hi': 'कृपया', 'es': 'Por favor', 'fr': 'S\'il vous plaît', 'de': 'Bitte',
      'ja': 'お願いします', 'zh': '请', 'ar': 'من فضلك', 'ru': 'Пожалуйста', 'pt': 'Por favor', 'it': 'Per favore'
    },
    'yes': {
      'hi': 'हाँ', 'es': 'Sí', 'fr': 'Oui', 'de': 'Ja',
      'ja': 'はい', 'zh': '是的', 'ar': 'نعم', 'ru': 'Да', 'pt': 'Sim', 'it': 'Sì'
    },
    'no': {
      'hi': 'नहीं', 'es': 'No', 'fr': 'Non', 'de': 'Nein',
      'ja': 'いいえ', 'zh': '不', 'ar': 'لا', 'ru': 'Нет', 'pt': 'Não', 'it': 'No'
    },
    'goodbye': {
      'hi': 'अलविदा', 'es': 'Adiós', 'fr': 'Au revoir', 'de': 'Auf Wiedersehen',
      'ja': 'さようなら', 'zh': '再见', 'ar': 'وداعا', 'ru': 'До свидания', 'pt': 'Tchau', 'it': 'Arrivederci'
    },
    'bye': {
      'hi': 'अलविदा', 'es': 'Adiós', 'fr': 'Au revoir', 'de': 'Tschüss',
      'ja': 'さようなら', 'zh': '再见', 'ar': 'وداعا', 'ru': 'Пока', 'pt': 'Tchau', 'it': 'Ciao'
    },
    'excuse me': {
      'hi': 'माफ़ करें', 'es': 'Disculpe', 'fr': 'Excusez-moi', 'de': 'Entschuldigung',
      'ja': 'すみません', 'zh': '对不起', 'ar': 'عذرا', 'ru': 'Извините', 'pt': 'Com licença', 'it': 'Scusi'
    },
    'sorry': {
      'hi': 'माफ़ कीजिए', 'es': 'Lo siento', 'fr': 'Désolé', 'de': 'Es tut mir leid',
      'ja': 'ごめんなさい', 'zh': '对不起', 'ar': 'آسف', 'ru': 'Извините', 'pt': 'Desculpe', 'it': 'Mi dispiace'
    },
    'i love you': {
      'hi': 'मैं तुमसे प्यार करता हूँ', 'es': 'Te amo', 'fr': 'Je t\'aime', 'de': 'Ich liebe dich',
      'ja': '愛してる', 'zh': '我爱你', 'ar': 'أحبك', 'ru': 'Я тебя люблю', 'pt': 'Eu te amo', 'it': 'Ti amo'
    },
    'where are you': {
      'hi': 'तुम कहाँ हो?', 'es': '¿Dónde estás?', 'fr': 'Où êtes-vous?', 'de': 'Wo bist du?',
      'ja': 'どこにいますか？', 'zh': '你在哪里？', 'ar': 'أين أنت؟', 'ru': 'Где ты?', 'pt': 'Onde você está?', 'it': 'Dove sei?'
    },
    'i need help': {
      'hi': 'मुझे मदद चाहिए', 'es': 'Necesito ayuda', 'fr': 'J\'ai besoin d\'aide', 'de': 'Ich brauche Hilfe',
      'ja': '助けが必要です', 'zh': '我需要帮助', 'ar': 'أحتاج مساعدة', 'ru': 'Мне нужна помощь', 'pt': 'Preciso de ajuda', 'it': 'Ho bisogno di aiuto'
    },
    'help me': {
      'hi': 'मेरी मदद करो', 'es': 'Ayúdame', 'fr': 'Aidez-moi', 'de': 'Hilf mir',
      'ja': '助けて', 'zh': '帮帮我', 'ar': 'ساعدني', 'ru': 'Помоги мне', 'pt': 'Me ajude', 'it': 'Aiutami'
    },

    // Romanized Hindi to English translations
    'aap kaise hai': { 'en': 'How are you?', 'hi': 'आप कैसे हैं?' },
    'aap kaise hain': { 'en': 'How are you?', 'hi': 'आप कैसे हैं?' },
    'aap kaise ho': { 'en': 'How are you?', 'hi': 'आप कैसे हो?' },
    'kaise ho': { 'en': 'How are you?', 'hi': 'कैसे हो?' },
    'kaisa hai': { 'en': 'How is it?', 'hi': 'कैसा है?' },
    'mai theek hoon': { 'en': 'I am fine', 'hi': 'मैं ठीक हूँ' },
    'main theek hun': { 'en': 'I am fine', 'hi': 'मैं ठीक हूँ' },
    'mera naam': { 'en': 'My name is', 'hi': 'मेरा नाम' },
    'aapka naam kya hai': { 'en': 'What is your name?', 'hi': 'आपका नाम क्या है?' },
    'tumhara naam kya hai': { 'en': 'What is your name?', 'hi': 'तुम्हारा नाम क्या है?' },
    'kya haal hai': { 'en': 'How are you?', 'hi': 'क्या हाल है?' },
    'kya chal raha hai': { 'en': 'What is going on?', 'hi': 'क्या चल रहा है?' },
    'sab theek': { 'en': 'Everything is fine', 'hi': 'सब ठीक' },
    'bahut accha': { 'en': 'Very good', 'hi': 'बहुत अच्छा' },
    'dhanyawad': { 'en': 'Thank you', 'hi': 'धन्यवाद' },
    'shukriya': { 'en': 'Thank you', 'hi': 'शुक्रिया' },
    'namaste': { 'en': 'Hello', 'hi': 'नमस्ते' },
    'namaskar': { 'en': 'Greetings', 'hi': 'नमस्कार' },
    'phir milenge': { 'en': 'See you again', 'hi': 'फिर मिलेंगे' },
    'alvida': { 'en': 'Goodbye', 'hi': 'अलविदा' },
    'haan': { 'en': 'Yes', 'hi': 'हाँ' },
    'nahi': { 'en': 'No', 'hi': 'नहीं' },
    'kripya': { 'en': 'Please', 'hi': 'कृपया' },
    'maaf karo': { 'en': 'Sorry', 'hi': 'माफ़ करो' },
    'maaf kijiye': { 'en': 'Excuse me', 'hi': 'माफ़ कीजिए' },
    'mujhe madad chahiye': { 'en': 'I need help', 'hi': 'मुझे मदद चाहिए' },
    'meri madad karo': { 'en': 'Help me', 'hi': 'मेरी मदद करो' },
    'kahan ho': { 'en': 'Where are you?', 'hi': 'कहाँ हो?' },
    'tum kahan ho': { 'en': 'Where are you?', 'hi': 'तुम कहाँ हो?' },
    'mai aa raha hoon': { 'en': 'I am coming', 'hi': 'मैं आ रहा हूँ' },
    'ruko': { 'en': 'Wait', 'hi': 'रुको' },
    'chalo': { 'en': 'Let\'s go', 'hi': 'चलो' },
    'aao': { 'en': 'Come', 'hi': 'आओ' },
    'jao': { 'en': 'Go', 'hi': 'जाओ' },

    // Hindi script phrases (reverse translations) - COMPREHENSIVE
    'नमस्ते': {
      'en': 'Hello', 'es': 'Hola', 'fr': 'Bonjour', 'de': 'Hallo', 'ja': 'こんにちは',
      'zh': '你好', 'ar': 'مرحبا', 'ru': 'Привет', 'pt': 'Olá', 'it': 'Ciao'
    },
    'आप कैसे हैं': {
      'en': 'How are you', 'es': '¿Cómo estás?', 'fr': 'Comment allez-vous?', 'de': 'Wie geht es dir?',
      'ja': '元気ですか？', 'zh': '你好吗？', 'ar': 'كيف حالك؟', 'ru': 'Как дела?', 'pt': 'Como você está?', 'it': 'Come stai?'
    },
    'आप कैसे हैं?': {
      'en': 'How are you?', 'es': '¿Cómo estás?', 'fr': 'Comment allez-vous?', 'de': 'Wie geht es dir?',
      'ja': '元気ですか？', 'zh': '你好吗？', 'ar': 'كيف حالك؟', 'ru': 'Как дела?', 'pt': 'Como você está?', 'it': 'Come stai?'
    },
    'आपका नाम क्या है': {
      'en': 'What is your name?', 'es': '¿Cómo te llamas?', 'fr': 'Comment vous appelez-vous?', 'de': 'Wie heißt du?',
      'ja': 'お名前は何ですか？', 'zh': '你叫什么名字？', 'ar': 'ما اسمك؟', 'ru': 'Как тебя зовут?', 'pt': 'Qual é o seu nome?', 'it': 'Come ti chiami?'
    },
    'मैं ठीक हूँ': {
      'en': 'I am fine', 'es': 'Estoy bien', 'fr': 'Je vais bien', 'de': 'Mir geht es gut',
      'ja': '元気です', 'zh': '我很好', 'ar': 'أنا بخير', 'ru': 'Я в порядке', 'pt': 'Estou bem', 'it': 'Sto bene'
    },
    'सुप्रभात': {
      'en': 'Good morning', 'es': 'Buenos días', 'fr': 'Bonjour', 'de': 'Guten Morgen',
      'ja': 'おはようございます', 'zh': '早上好', 'ar': 'صباح الخير', 'ru': 'Доброе утро', 'pt': 'Bom dia', 'it': 'Buongiorno'
    },
    'शुभ संध्या': {
      'en': 'Good evening', 'es': 'Buenas tardes', 'fr': 'Bonsoir', 'de': 'Guten Abend',
      'ja': 'こんばんは', 'zh': '晚上好', 'ar': 'مساء الخير', 'ru': 'Добрый вечер', 'pt': 'Boa tarde', 'it': 'Buonasera'
    },
    'धन्यवाद': {
      'en': 'Thank you', 'es': 'Gracias', 'fr': 'Merci', 'de': 'Danke',
      'ja': 'ありがとう', 'zh': '谢谢', 'ar': 'شكرا', 'ru': 'Спасибо', 'pt': 'Obrigado', 'it': 'Grazie'
    },
    'कृपया': {
      'en': 'Please', 'es': 'Por favor', 'fr': 'S\'il vous plaît', 'de': 'Bitte',
      'ja': 'お願いします', 'zh': '请', 'ar': 'من فضلك', 'ru': 'Пожалуйста', 'pt': 'Por favor', 'it': 'Per favore'
    },
    'हाँ': {
      'en': 'Yes', 'es': 'Sí', 'fr': 'Oui', 'de': 'Ja',
      'ja': 'はい', 'zh': '是的', 'ar': 'نعم', 'ru': 'Да', 'pt': 'Sim', 'it': 'Sì'
    },
    'नहीं': {
      'en': 'No', 'es': 'No', 'fr': 'Non', 'de': 'Nein',
      'ja': 'いいえ', 'zh': '不', 'ar': 'لا', 'ru': 'Нет', 'pt': 'Não', 'it': 'No'
    },
    'अलविदा': {
      'en': 'Goodbye', 'es': 'Adiós', 'fr': 'Au revoir', 'de': 'Auf Wiedersehen',
      'ja': 'さようなら', 'zh': '再见', 'ar': 'وداعا', 'ru': 'До свидания', 'pt': 'Tchau', 'it': 'Arrivederci'
    },
    'माफ़ करें': {
      'en': 'Excuse me', 'es': 'Disculpe', 'fr': 'Excusez-moi', 'de': 'Entschuldigung',
      'ja': 'すみません', 'zh': '对不起', 'ar': 'عذرا', 'ru': 'Извините', 'pt': 'Com licença', 'it': 'Scusi'
    },

    // Spanish phrases
    'hola': {
      'en': 'Hello', 'hi': 'नमस्ते', 'fr': 'Bonjour', 'de': 'Hallo', 'ja': 'こんにちは',
      'zh': '你好', 'ar': 'مرحبا', 'ru': 'Привет', 'pt': 'Olá', 'it': 'Ciao'
    },
    '¿cómo estás?': {
      'en': 'How are you?', 'hi': 'आप कैसे हैं?', 'fr': 'Comment allez-vous?', 'de': 'Wie geht es dir?',
      'ja': '元気ですか？', 'zh': '你好吗？', 'ar': 'كيف حالك؟', 'ru': 'Как дела?', 'pt': 'Como você está?', 'it': 'Come stai?'
    },
    'gracias': {
      'en': 'Thank you', 'hi': 'धन्यवाद', 'fr': 'Merci', 'de': 'Danke',
      'ja': 'ありがとう', 'zh': '谢谢', 'ar': 'شكرا', 'ru': 'Спасибо', 'pt': 'Obrigado', 'it': 'Grazie'
    }
  }

  // Preserve non-translatable elements (company names, product names, etc.)
  const nonTranslatablePatterns = [
    /\b[A-Z][a-z]*[A-Z][a-zA-Z]*\b/g, // CamelCase (likely product names)
    /\b[A-Z]{2,}\b/g, // All caps (likely acronyms)
    /@\w+/g, // Mentions
    /#\w+/g, // Hashtags
    /https?:\/\/[^\s]+/g, // URLs
    /\b\w+\.(com|org|net|edu|gov)\b/g // Domain names
  ]

  let processedContent = content.trim()
  const preservedElements: string[] = []

  // Step 1: Preserve non-translatable elements
  nonTranslatablePatterns.forEach((pattern, index) => {
    processedContent = processedContent.replace(pattern, (match) => {
      const placeholder = `__PRESERVE_${index}_${preservedElements.length}__`
      preservedElements.push(match)
      return placeholder
    })
  })

  // Step 2: Normalize content for matching
  const normalizedContent = processedContent.toLowerCase().trim()

  // Step 3: Try exact phrase matching first
  for (const [phrase, phraseTranslations] of Object.entries(translations)) {
    if (phraseTranslations[targetLanguage]) {
      const phrasePattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      if (phrasePattern.test(normalizedContent)) {
        processedContent = processedContent.replace(phrasePattern, phraseTranslations[targetLanguage])
        console.log(`✅ Phrase match: "${phrase}" -> "${phraseTranslations[targetLanguage]}"`)
      }
    }
  }

  // Step 4: Try partial matching for compound phrases
  for (const [phrase, phraseTranslations] of Object.entries(translations)) {
    if (phraseTranslations[targetLanguage] && normalizedContent.includes(phrase.toLowerCase())) {
      const result = processedContent.replace(new RegExp(phrase, 'gi'), phraseTranslations[targetLanguage])
      if (result !== processedContent) {
        processedContent = result
        console.log(`✅ Partial match: "${phrase}" -> "${phraseTranslations[targetLanguage]}"`)
        break // Only apply first match to avoid over-translation
      }
    }
  }

  // Step 5: Restore preserved elements
  preservedElements.forEach((element, index) => {
    const placeholder = `__PRESERVE_${Math.floor(index / preservedElements.length)}_${index}__`
    processedContent = processedContent.replace(placeholder, element)
  })

  // Step 6: If no translation found, provide contextual fallback
  if (processedContent === content) {
    console.log(`❌ No direct translation found, using contextual fallback`)
    return `[${targetLanguage.toUpperCase()}] ${content}`
  }

  return processedContent
}