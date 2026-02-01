// Unit tests for MessageParser

import { MessageParser, parseMessage, validateMessage, getTranslatableContent, restoreCodeInTranslation } from '../MessageParser'

describe('MessageParser', () => {
  let parser: MessageParser

  beforeEach(() => {
    parser = new MessageParser()
  })

  describe('parse', () => {
    it('should parse simple text message', () => {
      const result = parser.parse('Hello world')
      
      expect(result.isValid).toBe(true)
      expect(result.content).toBe('Hello world')
      expect(result.plainText).toBe('Hello world')
      expect(result.hasCodeBlocks).toBe(false)
      expect(result.hasInlineCode).toBe(false)
      expect(result.hasMarkdown).toBe(false)
      expect(result.errors).toHaveLength(0)
    })

    it('should parse message with code blocks', () => {
      const content = 'Here is some code:\n```javascript\nconsole.log("hello")\n```\nThat was code.'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.hasCodeBlocks).toBe(true)
      expect(result.codeBlocks).toHaveLength(1)
      expect(result.codeBlocks[0].language).toBe('javascript')
      expect(result.codeBlocks[0].code).toBe('console.log("hello")')
    })

    it('should parse message with inline code', () => {
      const content = 'Use the `console.log()` function to debug.'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.hasInlineCode).toBe(true)
      expect(result.inlineCodeSpans).toContain('console.log()')
    })

    it('should parse message with markdown formatting', () => {
      const content = 'This is **bold** and *italic* text.'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.hasMarkdown).toBe(true)
      expect(result.plainText).toBe('This is bold and italic text.')
    })

    it('should parse complex message with mixed content', () => {
      const content = `# Heading
      
This is **bold** text with \`inline code\` and a code block:

\`\`\`python
def hello():
    print("Hello world")
\`\`\`

And some *italic* text.`
      
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.hasCodeBlocks).toBe(true)
      expect(result.hasInlineCode).toBe(true)
      expect(result.hasMarkdown).toBe(true)
      expect(result.codeBlocks[0].language).toBe('python')
      expect(result.inlineCodeSpans).toContain('inline code')
    })

    it('should handle empty content', () => {
      const result = parser.parse('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Content is required')
    })

    it('should handle content exceeding max length', () => {
      const longContent = 'a'.repeat(5000)
      const result = parser.parse(longContent)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds maximum length')
    })

    it('should detect forbidden patterns', () => {
      const maliciousContent = 'Click here: <script>alert("xss")</script>'
      const result = parser.parse(maliciousContent)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('forbidden pattern')
    })
  })

  describe('validate', () => {
    it('should validate correct content', () => {
      const result = parser.validate('This is valid content with **markdown**.')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty content', () => {
      const result = parser.validate('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Message content cannot be empty')
    })

    it('should reject content that is too long', () => {
      const longContent = 'a'.repeat(5000)
      const result = parser.validate(longContent)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds maximum length')
    })

    it('should detect unmatched markdown delimiters', () => {
      const result = parser.validate('This has **unmatched bold')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unmatched bold markdown delimiters (**)')
    })

    it('should detect unmatched code blocks', () => {
      const result = parser.validate('```\ncode without closing')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unmatched code block delimiters (```)')
    })

    it('should detect unmatched inline code', () => {
      const result = parser.validate('This has `unmatched inline code')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unmatched inline code delimiters (`)')
    })

    it('should handle code blocks when counting inline code delimiters', () => {
      const result = parser.validate('```\ncode block\n```\nand `inline code`')
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('getContentWithCodePlaceholders', () => {
    it('should replace code blocks with placeholders', () => {
      const content = 'Text ```js\ncode\n``` more text'
      const parsed = parser.parse(content)
      const result = parser.getContentWithCodePlaceholders(parsed)
      
      expect(result).toContain('__CODE_BLOCK_0__')
      expect(result).not.toContain('```')
    })

    it('should handle content without code blocks', () => {
      const content = 'Just plain text'
      const parsed = parser.parse(content)
      const result = parser.getContentWithCodePlaceholders(parsed)
      
      expect(result).toBe(content)
    })
  })

  describe('restoreCodeBlocks', () => {
    it('should restore code blocks from placeholders', () => {
      const originalContent = 'Text ```js\ncode\n``` more text'
      const parsed = parser.parse(originalContent)
      const withPlaceholders = parser.getContentWithCodePlaceholders(parsed)
      const restored = parser.restoreCodeBlocks(withPlaceholders, parsed)
      
      expect(restored).toContain('```js')
      expect(restored).toContain('code')
      expect(restored).toContain('```')
    })
  })

  describe('getTranslatableContent', () => {
    it('should create translatable content by replacing code with placeholders', () => {
      const content = 'Use `console.log()` like this:\n```js\nconsole.log("hello")\n```'
      const parsed = parser.parse(content)
      const translatable = parser.getTranslatableContent(parsed)
      
      expect(translatable).toContain('__CODE_BLOCK_0__')
      expect(translatable).toContain('__INLINE_CODE_0__')
      expect(translatable).not.toContain('console.log')
      expect(translatable).not.toContain('```')
    })
  })

  describe('restoreAllCode', () => {
    it('should restore both code blocks and inline code', () => {
      const originalContent = 'Use `console.log()` like this:\n```js\nconsole.log("hello")\n```'
      const parsed = parser.parse(originalContent)
      const translatable = parser.getTranslatableContent(parsed)
      const restored = parser.restoreAllCode(translatable, parsed)
      
      expect(restored).toContain('`console.log()`')
      expect(restored).toContain('```js')
      expect(restored).toContain('console.log("hello")')
    })
  })

  describe('isPrimarilyCode', () => {
    it('should detect when content is primarily code', () => {
      const content = '```js\nconst x = 1\nconst y = 2\nconst z = 3\n```\nShort text'
      const parsed = parser.parse(content)
      
      expect(parser.isPrimarilyCode(parsed)).toBe(true)
    })

    it('should detect when content is primarily text', () => {
      const content = 'This is a long explanation about how to use the `console.log()` function in JavaScript.'
      const parsed = parser.parse(content)
      
      expect(parser.isPrimarilyCode(parsed)).toBe(false)
    })
  })

  describe('utility functions', () => {
    it('should provide parseMessage utility', () => {
      const result = parseMessage('Hello **world**')
      
      expect(result.isValid).toBe(true)
      expect(result.hasMarkdown).toBe(true)
    })

    it('should provide validateMessage utility', () => {
      const result = validateMessage('Valid content')
      
      expect(result.isValid).toBe(true)
    })

    it('should provide getTranslatableContent utility', () => {
      const { translatableContent, parsedMessage } = getTranslatableContent('Use `code` here')
      
      expect(translatableContent).toContain('__INLINE_CODE_0__')
      expect(parsedMessage.hasInlineCode).toBe(true)
    })

    it('should provide restoreCodeInTranslation utility', () => {
      const original = 'Use `console.log()` function'
      const { translatableContent, parsedMessage } = getTranslatableContent(original)
      const translated = 'Utiliza la función __INLINE_CODE_0__'
      const restored = restoreCodeInTranslation(translated, parsedMessage)
      
      expect(restored).toBe('Utiliza la función `console.log()`')
    })
  })

  describe('edge cases', () => {
    it('should handle nested markdown', () => {
      const content = '**This is _nested_ formatting**'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.hasMarkdown).toBe(true)
    })

    it('should handle code blocks without language', () => {
      const content = '```\nplain code\n```'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.codeBlocks[0].language).toBeUndefined()
      expect(result.codeBlocks[0].code).toBe('plain code')
    })

    it('should handle multiple code blocks', () => {
      const content = '```js\ncode1\n```\ntext\n```python\ncode2\n```'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.codeBlocks).toHaveLength(2)
      expect(result.codeBlocks[0].language).toBe('js')
      expect(result.codeBlocks[1].language).toBe('python')
    })

    it('should handle strikethrough formatting', () => {
      const content = 'This is ~~deleted~~ text'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.hasMarkdown).toBe(true)
      expect(result.plainText).toBe('This is deleted text')
    })

    it('should handle mixed quote types in code', () => {
      const content = '```js\nconsole.log("hello \'world\'")\n```'
      const result = parser.parse(content)
      
      expect(result.isValid).toBe(true)
      expect(result.codeBlocks[0].code).toContain("hello 'world'")
    })
  })

  describe('custom grammar', () => {
    it('should respect custom max length', () => {
      const customParser = new MessageParser({ maxLength: 10 })
      const result = customParser.parse('This is too long')
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds maximum length of 10')
    })

    it('should respect custom forbidden patterns', () => {
      const customParser = new MessageParser({ 
        forbiddenPatterns: [/badword/gi] 
      })
      const result = customParser.parse('This contains badword')
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('forbidden pattern')
    })
  })
})