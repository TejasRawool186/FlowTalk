// Enhanced Language Detection Service with Romanized Language Support

import { LanguageDetector } from './interfaces'
import { LanguageCode } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { LanguageDetectionError, handleError } from '@/lib/errors'

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

export class LanguageDetectorImpl implements LanguageDetector {
  private commonWords: Record<string, string[]> = {
    'en': [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'now'
    ],
    'es': [
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo',
      'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las',
      'una', 'como', 'pero', 'sus', 'le', 'ya', 'o', 'porque', 'cuando', 'muy',
      'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde',
      'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros',
      'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué',
      'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho',
      'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas',
      'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus', 'ellas', 'nosotras'
    ],
    'fr': [
      'le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour',
      'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus',
      'par', 'grand', 'en', 'une', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans',
      'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par',
      'grand', 'en', 'une', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce',
      'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand',
      'du', 'la', 'des', 'les', 'au', 'aux', 'je', 'tu', 'nous', 'vous', 'ils', 'elles',
      'me', 'te', 'se', 'nous', 'vous', 'leur', 'leurs', 'mon', 'ma', 'mes', 'ton', 'ta',
      'tes', 'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos'
    ],
    'de': [
      'der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des',
      'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch',
      'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'wird',
      'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über', 'einen',
      'so', 'zum', 'war', 'haben', 'nur', 'oder', 'aber', 'vor', 'zur', 'bis',
      'mehr', 'durch', 'man', 'sein', 'wurde', 'sei', 'in', 'ich', 'du', 'er',
      'sie', 'es', 'wir', 'ihr', 'sie', 'mich', 'mir', 'mein', 'dich', 'dir',
      'dein', 'ihn', 'ihm', 'sein', 'uns', 'unser', 'euch', 'euer', 'ihnen', 'ihr'
    ],
    'it': [
      'il', 'di', 'che', 'e', 'la', 'per', 'un', 'in', 'con', 'del', 'da', 'a',
      'al', 'le', 'si', 'dei', 'come', 'su', 'le', 'alla', 'nel', 'una', 'sono',
      'dalla', 'questo', 'hanno', 'lo', 'ma', 'all', 'o', 'anche', 'più', 'dopo',
      'molto', 'fare', 'dove', 'quella', 'anni', 'cui', 'mi', 'stato', 'oggi',
      'mai', 'fra', 'durante', 'loro', 'mio', 'tempo', 'senza', 'forse', 'suo',
      'così', 'dire', 'quando', 'questo', 'ogni', 'viene', 'è', 'tutti', 'già',
      'attraverso', 'anche', 'solo', 'però', 'anni', 'ancora', 'fino', 'ora',
      'mentre', 'qui', 'dove', 'perché', 'tanto', 'cosa', 'quella', 'volta',
      'sempre', 'tutto', 'lei', 'ci', 'durante', 'tutti', 'tempo', 'molto'
    ],
    'pt': [
      'o', 'de', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não',
      'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas',
      'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando',
      'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela',
      'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos',
      'ter', 'seus', 'suas', 'numa', 'pelos', 'pelas', 'esse', 'eles', 'estão',
      'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às',
      'minha', 'têm', 'numa', 'pelos', 'pelas', 'essas', 'esses', 'pelas',
      'aquela', 'aquele', 'deles', 'delas', 'esta', 'estas', 'este', 'estes'
    ],
    'ru': [
      'в', 'и', 'не', 'на', 'я', 'быть', 'то', 'он', 'оно', 'как', 'по', 'но',
      'они', 'мы', 'этот', 'она', 'а', 'к', 'мой', 'вы', 'ты', 'из', 'у', 'же',
      'за', 'если', 'ли', 'более', 'эти', 'так', 'чем', 'была', 'сам', 'чтобы',
      'без', 'будто', 'человек', 'чего', 'раз', 'тоже', 'себя', 'под', 'будет',
      'жизнь', 'будут', 'же', 'для', 'надо', 'любить', 'уж', 'во', 'над',
      'долго', 'быстро', 'никогда', 'совсем', 'ни', 'теперь', 'новый', 'может',
      'старый', 'где', 'каждый', 'главный', 'место', 'работа', 'слово', 'дело',
      'жить', 'такой', 'какой', 'здесь', 'свой', 'образ', 'под', 'формула'
    ],
    'ja': [
      'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ',
      'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や',
      'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう',
      'また', 'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か',
      'だ', 'これ', 'によって', 'により', 'おり', 'より', 'による', 'ず',
      'なり', 'られる', 'において', 'ば', 'なかっ', 'なく', 'しかし', 'について',
      'せ', 'だっ', 'その後', 'できる', 'それ', 'う', 'ので', 'なお', 'のみ',
      'でき', 'き', 'つ', 'における', 'および', 'いう', 'さらに', 'でも',
      'ら', 'たり', 'その他', 'に関して', 'たち', 'ます', 'ん', 'なら'
    ],
    'ko': [
      '이', '의', '가', '을', '는', '에', '한', '하다', '있다', '되다', '와', '로',
      '으로', '자', '에게', '와서', '에서', '으로서', '를', '과', '도', '만', '에서도',
      '부터', '까지', '에게서', '로부터', '에게로', '으로부터', '에게까지', '로서',
      '에 대해', '에 관해', '에 의해', '로 인해', '때문에', '에 따라', '에 비해',
      '에 반해', '에 대한', '에 관한', '에 의한', '로 인한', '때문인', '에 따른',
      '에 비한', '에 반한', '그리고', '그러나', '하지만', '그런데', '따라서',
      '그러므로', '그래서', '또한', '또', '역시', '물론', '예를 들어', '즉',
      '다시 말해', '바꿔 말하면', '요약하면', '결론적으로', '마지막으로'
    ],
    'zh': [
      '的', '一', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为',
      '上', '个', '国', '我', '以', '要', '他', '时', '来', '用', '们', '生', '到',
      '作', '地', '于', '出', '就', '分', '对', '成', '会', '可', '主', '发', '年',
      '动', '同', '工', '也', '能', '下', '过', '子', '说', '产', '种', '面', '而',
      '方', '后', '多', '定', '行', '学', '法', '所', '民', '得', '经', '十', '三',
      '之', '进', '着', '等', '部', '度', '家', '电', '力', '里', '如', '水', '化',
      '高', '自', '二', '理', '起', '小', '物', '现', '实', '加', '量', '都', '两',
      '体', '制', '机', '当', '使', '点', '从', '业', '本', '去', '把', '性', '好',
      '应', '开', '它', '合', '还', '因', '由', '其', '些', '然', '前', '外', '天',
      '政', '四', '日', '那', '社', '义', '事', '平', '形', '相', '全', '表', '间',
      '样', '与', '关', '各', '重', '新', '线', '内', '数', '正', '心', '反', '你',
      '明', '看', '原', '又', '么', '利', '比', 'ä¸', 'ä¸€', 'æ˜¯', 'åœ¨', 'ä¸', 'äº†'
    ],
    'ar': [
      'في', 'من', 'إلى', 'على', 'هذا', 'هذه', 'التي', 'الذي', 'أن', 'كان', 'لم',
      'قد', 'ما', 'لا', 'أو', 'إذا', 'كل', 'بعد', 'عند', 'أي', 'حيث', 'بين',
      'خلال', 'قبل', 'حول', 'ضد', 'نحو', 'عبر', 'فوق', 'تحت', 'أمام', 'خلف',
      'يمين', 'يسار', 'داخل', 'خارج', 'معا', 'سويا', 'أيضا', 'كذلك', 'هكذا',
      'هناك', 'هنا', 'أين', 'كيف', 'متى', 'لماذا', 'ماذا', 'من', 'أي', 'كم',
      'أنا', 'أنت', 'هو', 'هي', 'نحن', 'أنتم', 'هم', 'هن', 'لي', 'لك', 'له',
      'لها', 'لنا', 'لكم', 'لهم', 'لهن', 'بي', 'بك', 'به', 'بها', 'بنا', 'بكم',
      'بهم', 'بهن', 'عني', 'عنك', 'عنه', 'عنها', 'عنا', 'عنكم', 'عنهم', 'عنهن'
    ],
    'hi': [
      'के', 'में', 'की', 'को', 'से', 'पर', 'है', 'और', 'एक', 'यह', 'वह', 'था',
      'हैं', 'थे', 'होगा', 'होगी', 'होंगे', 'करना', 'किया', 'करते', 'करती',
      'करेंगे', 'करेगा', 'करेगी', 'कर', 'कि', 'जो', 'भी', 'अब', 'तब', 'यदि',
      'तो', 'या', 'नहीं', 'न', 'ना', 'मत', 'क्या', 'कैसे', 'कब', 'कहाँ', 'क्यों',
      'कौन', 'कितना', 'कितनी', 'कितने', 'मैं', 'तू', 'तुम', 'आप', 'वे', 'हम',
      'मेरा', 'मेरी', 'मेरे', 'तेरा', 'तेरी', 'तेरे', 'तुम्हारा', 'तुम्हारी',
      'तुम्हारे', 'आपका', 'आपकी', 'आपके', 'उसका', 'उसकी', 'उसके', 'उनका',
      'उनकी', 'उनके', 'हमारा', 'हमारी', 'हमारे', 'इस', 'उस', 'इन', 'उन',
      'यहाँ', 'वहाँ', 'जहाँ', 'कहीं', 'सब', 'कुछ', 'कोई', 'सभी', 'अधिक', 'कम'
    ],
    // Romanized Hindi (Hinglish) - common romanized words and phrases
    'hi-rom': [
      // Common words
      'hai', 'hain', 'tha', 'the', 'hoga', 'hogi', 'honge', 'karna', 'kiya', 'karte',
      'karti', 'karenge', 'karega', 'karegi', 'kar', 'ki', 'jo', 'bhi', 'ab', 'tab',
      'yadi', 'to', 'ya', 'nahi', 'na', 'mat', 'kya', 'kaise', 'kab', 'kahan', 'kyon',
      'kaun', 'kitna', 'kitni', 'kitne', 'main', 'tu', 'tum', 'aap', 've', 'hum',
      'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'tumhara', 'tumhari', 'tumhare',
      'aapka', 'aapki', 'aapke', 'uska', 'uski', 'uske', 'unka', 'unki', 'unke',
      'hamara', 'hamari', 'hamare', 'is', 'us', 'in', 'un', 'yahan', 'vahan', 'jahan',
      'kahin', 'sab', 'kuch', 'koi', 'sabhi', 'adhik', 'kam', 'ke', 'mein', 'se',
      'par', 'aur', 'ek', 'yeh', 'vah', 'chahiye', 'chahte', 'chahti', 'liye', 'liya',
      'diya', 'dena', 'lena', 'jaana', 'aana', 'gaya', 'aayi', 'gaye', 'aaye', 'muje',
      'mujhe', 'tuje', 'tujhe', 'use', 'unhe', 'hame', 'tumhe', 'apne', 'apni', 'apna',
      // Additional common phrases
      'accha', 'theek', 'bahut', 'zyada', 'thoda', 'abhi', 'baad', 'pehle', 'saath',
      'wala', 'wali', 'wale', 'karo', 'bolo', 'batao', 'dekho', 'suno', 'jao', 'aao',
      'raho', 'khao', 'piyo', 'padho', 'likho', 'samjho', 'socho', 'baitho', 'uthao',
      'project', 'help', 'please', 'thanks', 'sorry', 'hello', 'bye', 'ok', 'done',
      // Question patterns
      'kyun', 'kaise', 'kidhar', 'kiska', 'kiski', 'kiske', 'kaisa', 'kaisi', 'kaise'
    ]
  }

  private languagePatterns: Record<string, RegExp[]> = {
    'en': [
      /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
      /\b(is|are|was|were|be|been|being|have|has|had)\b/gi,
      /\b(this|that|these|those|what|which|who|when|where|why|how)\b/gi
    ],
    'es': [
      /\b(el|la|los|las|un|una|unos|unas)\b/gi,
      /\b(de|del|en|con|por|para|desde|hasta)\b/gi,
      /\b(que|como|cuando|donde|porque|si)\b/gi,
      /ción\b/gi,
      /mente\b/gi
    ],
    'fr': [
      /\b(le|la|les|un|une|des|du|de|des)\b/gi,
      /\b(je|tu|il|elle|nous|vous|ils|elles)\b/gi,
      /\b(que|qui|quoi|comment|quand|où|pourquoi)\b/gi,
      /tion\b/gi,
      /ment\b/gi
    ],
    'de': [
      /\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer)\b/gi,
      /\b(ich|du|er|sie|es|wir|ihr|sie)\b/gi,
      /\b(und|oder|aber|wenn|weil|dass|wie)\b/gi,
      /ung\b/gi,
      /keit\b/gi,
      /lich\b/gi
    ],
    'it': [
      /\b(il|la|lo|gli|le|un|una|uno)\b/gi,
      /\b(di|da|in|con|su|per|tra|fra)\b/gi,
      /\b(che|chi|cosa|come|quando|dove|perché)\b/gi,
      /zione\b/gi,
      /mente\b/gi
    ],
    'pt': [
      /\b(o|a|os|as|um|uma|uns|umas)\b/gi,
      /\b(de|da|do|em|na|no|com|por|para)\b/gi,
      /\b(que|quem|o que|como|quando|onde|por que)\b/gi,
      /ção\b/gi,
      /mente\b/gi
    ],
    'ru': [
      /[а-яё]/gi,
      /\b(и|в|не|на|я|быть|то|он|как|по|но|они|мы|этот|она|а)\b/gi
    ],
    'ja': [
      /[ひらがな]/gi,
      /[カタカナ]/gi,
      /[一-龯]/gi,
      /\b(です|ます|である|だ|の|に|は|を|が|で|て|と)\b/gi
    ],
    'ko': [
      /[가-힣]/gi,
      /\b(이|그|저|의|가|을|는|에|한|하다|있다|되다)\b/gi
    ],
    'zh': [
      /[一-龯]/gi,
      /\b(的|一|是|在|不|了|有|和|人|这|中|大|为|上|个)\b/gi
    ],
    'ar': [
      /[ا-ي]/gi,
      /\b(في|من|إلى|على|هذا|هذه|التي|الذي|أن|كان)\b/gi
    ],
    'hi': [
      /[अ-ह]/gi,
      /\b(के|में|की|को|से|पर|है|और|एक|यह|वह|था)\b/gi
    ],
    // Romanized Hindi patterns
    'hi-rom': [
      /\b(hai|hain|tha|the|hoga|hogi|honge|karna|kiya|karte|karti)\b/gi,
      /\b(muje|mujhe|tuje|tujhe|use|unhe|hame|tumhe)\b/gi,
      /\b(chahiye|chahte|chahti|liye|liya|diya|dena|lena)\b/gi,
      /\b(jaana|aana|gaya|aayi|gaye|aaye|apne|apni|apna)\b/gi,
      /\b(ke|mein|ki|ko|se|par|aur|ek|yeh|vah)\b/gi,
      /\b(kya|kaise|kab|kahan|kyon|kaun|kitna|kitni)\b/gi
    ]
  }

  /**
   * Detect the language of the given content with romanization support
   */
  async detectLanguage(content: string): Promise<LanguageDetectionResult> {
    try {
      if (!content || !content.trim()) {
        throw new LanguageDetectionError('Content is required for language detection')
      }

      const cleanContent = this.cleanContent(content)

      // If content is too short, return English as default with low confidence
      if (cleanContent.length < 10) {
        return {
          language: 'en',
          confidence: 0.3,
          isRomanized: false,
          fallbackSuggestions: []
        }
      }

      const scores = this.calculateLanguageScores(cleanContent)
      const sortedScores = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Top 5 candidates

      // Check for romanized languages
      const romanizedResult = this.detectRomanizedLanguage(cleanContent, sortedScores)
      if (romanizedResult) {
        return romanizedResult
      }

      // Calculate confidence based on score distribution
      const topScore = sortedScores[0][1]
      const secondScore = sortedScores[1]?.[1] || 0
      const confidence = this.calculateConfidence(topScore, secondScore)

      const topLanguage = sortedScores[0][0] as LanguageCode

      // Validate that the detected language is supported
      const detectedLanguage = (topLanguage in SUPPORTED_LANGUAGES) ? topLanguage : 'en'

      // Generate fallback suggestions if confidence is low
      const fallbackSuggestions = confidence < 0.6
        ? sortedScores.slice(1, 4).map(([lang]) => lang as LanguageCode)
        : []

      return {
        language: detectedLanguage,
        confidence,
        isRomanized: false,
        fallbackSuggestions
      }
    } catch (error) {
      throw handleError(error, 'LanguageDetector.detectLanguage')
    }
  }

  /**
   * Check if content is romanized native language
   */
  async isRomanizedNativeLanguage(content: string): Promise<boolean> {
    try {
      if (!content || !content.trim()) {
        return false
      }

      const cleanContent = this.cleanContent(content)
      const scores = this.calculateLanguageScores(cleanContent)

      // Check if any romanized language has a significant score
      const romanizedLanguages = ['hi-rom'] // Can be extended for other languages
      for (const romLang of romanizedLanguages) {
        if (scores[romLang] && scores[romLang] > 0.1) {
          return true
        }
      }

      return false
    } catch (error) {
      throw handleError(error, 'LanguageDetector.isRomanizedNativeLanguage')
    }
  }

  /**
   * Get confidence score for a specific language
   */
  async getConfidenceScore(content: string, language: LanguageCode): Promise<number> {
    try {
      if (!content || !content.trim()) {
        return 0
      }

      const cleanContent = this.cleanContent(content)
      const scores = this.calculateLanguageScores(cleanContent)

      return scores[language] || 0
    } catch (error) {
      throw handleError(error, 'LanguageDetector.getConfidenceScore')
    }
  }

  /**
   * Detect mixed language content with segmentation
   */
  async detectMixedLanguageContent(content: string): Promise<MixedLanguageResult> {
    try {
      if (!content || !content.trim()) {
        throw new LanguageDetectionError('Content is required for mixed language detection')
      }

      // Split content into sentences
      const sentences = this.splitIntoSentences(content)
      const segments: MixedLanguageResult['segments'] = []
      const languageCounts: Record<string, number> = {}

      for (const sentence of sentences) {
        if (sentence.trim().length > 5) {
          const result = await this.detectLanguage(sentence)
          const lang = result.isRomanized ? `${result.language}-rom` : result.language

          languageCounts[lang] = (languageCounts[lang] || 0) + sentence.length

          segments.push({
            text: sentence,
            language: result.language,
            isProtected: false // Will be determined by Glossary Manager
          })
        }
      }

      // Determine primary language
      const primaryLanguage = Object.entries(languageCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0]?.replace('-rom', '') || 'en'

      return {
        primaryLanguage: primaryLanguage as LanguageCode,
        segments
      }
    } catch (error) {
      throw handleError(error, 'LanguageDetector.detectMixedLanguageContent')
    }
  }

  /**
   * Detect romanized language from scores
   */
  private detectRomanizedLanguage(
    content: string,
    sortedScores: [string, number][]
  ): LanguageDetectionResult | null {
    // Check for romanized Hindi (Hinglish)
    const hinglishScore = sortedScores.find(([lang]) => lang === 'hi-rom')?.[1] || 0
    const englishScore = sortedScores.find(([lang]) => lang === 'en')?.[1] || 0

    // If romanized Hindi score is significant and comparable to English
    if (hinglishScore > 0.15 && hinglishScore > englishScore * 0.5) {
      const confidence = this.calculateConfidence(hinglishScore, englishScore)

      return {
        language: 'hi',
        confidence,
        isRomanized: true,
        fallbackSuggestions: confidence < 0.6 ? ['en'] : []
      }
    }

    // Can be extended for other romanized languages
    return null
  }

  /**
   * Calculate confidence score based on top scores
   */
  private calculateConfidence(topScore: number, secondScore: number): number {
    if (secondScore === 0) {
      return Math.min(topScore * 2, 1.0)
    }

    const ratio = topScore / secondScore

    // Confidence increases with the ratio between top and second scores
    if (ratio > 2.0) return 0.9
    if (ratio > 1.5) return 0.75
    if (ratio > 1.2) return 0.6
    return 0.4
  }

  /**
   * Detect the primary language in mixed-language content
   */
  async detectPrimaryLanguage(content: string): Promise<LanguageCode> {
    try {
      if (!content || !content.trim()) {
        throw new LanguageDetectionError('Content is required for primary language detection')
      }

      const mixedResult = await this.detectMixedLanguageContent(content)
      return mixedResult.primaryLanguage
    } catch (error) {
      throw handleError(error, 'LanguageDetector.detectPrimaryLanguage')
    }
  }

  /**
   * Check if language detection is uncertain
   */
  async isLanguageDetectionUncertain(content: string): Promise<boolean> {
    try {
      if (!content || !content.trim()) {
        return true
      }

      const result = await this.detectLanguage(content)

      // Consider detection uncertain if confidence is below 0.6
      return result.confidence < 0.6
    } catch (error) {
      throw handleError(error, 'LanguageDetector.isLanguageDetectionUncertain')
    }
  }

  /**
   * Clean content for language detection
   */
  private cleanContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`\n]+`/g, '') // Remove inline code
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/@[^\s]+/g, '') // Remove mentions
      .replace(/#[^\s]+/g, '') // Remove hashtags
      .replace(/[^\w\s\u00C0-\u017F\u0400-\u04FF\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u0600-\u06ff\u0900-\u097f]/g, ' ') // Keep only letters and basic punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Calculate language scores based on common words and patterns
   */
  private calculateLanguageScores(content: string): Record<string, number> {
    const scores: Record<string, number> = {}
    const words = content.split(/\s+/)
    const totalWords = words.length

    // Initialize scores
    Object.keys(this.commonWords).forEach(lang => {
      scores[lang] = 0
    })

    // Score based on common words
    for (const word of words) {
      for (const [lang, commonWords] of Object.entries(this.commonWords)) {
        if (commonWords.includes(word)) {
          scores[lang] += 2 / totalWords // Weight by inverse of total words
        }
      }
    }

    // Score based on language patterns
    for (const [lang, patterns] of Object.entries(this.languagePatterns)) {
      for (const pattern of patterns) {
        const matches = content.match(pattern)
        if (matches) {
          scores[lang] += matches.length * 0.5 / content.length
        }
      }
    }

    // Bonus for character sets
    this.addCharacterSetBonus(content, scores)

    return scores
  }

  /**
   * Add bonus scores based on character sets
   */
  private addCharacterSetBonus(content: string, scores: Record<string, number>): void {
    // Cyrillic characters (Russian)
    if (/[а-яё]/i.test(content)) {
      scores['ru'] += 0.5
    }

    // Chinese characters
    if (/[一-龯]/.test(content)) {
      scores['zh'] += 0.5
    }

    // Japanese characters
    if (/[ひらがなカタカナ]/.test(content)) {
      scores['ja'] += 0.5
    }

    // Korean characters
    if (/[가-힣]/.test(content)) {
      scores['ko'] += 0.5
    }

    // Arabic characters
    if (/[ا-ي]/.test(content)) {
      scores['ar'] += 0.5
    }

    // Hindi characters
    if (/[अ-ह]/.test(content)) {
      scores['hi'] += 0.5
    }

    // Accented characters (Romance languages)
    if (/[àáâãäåæçèéêëìíîïñòóôõöøùúûüý]/.test(content)) {
      scores['fr'] += 0.2
      scores['es'] += 0.2
      scores['pt'] += 0.2
      scores['it'] += 0.2
    }

    // German umlauts
    if (/[äöüß]/.test(content)) {
      scores['de'] += 0.3
    }
  }

  /**
   * Split content into sentences for analysis
   */
  private splitIntoSentences(content: string): string[] {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }
}