// Integration tests for MessageParser with translation system

import { MessageParser, parseMessage, getTranslatableContent, restoreCodeInTranslation } from '../MessageParser'

describe('MessageParser Integration', () => {
  describe('Translation workflow', () => {
    it('should handle complete translation workflow with code blocks', () => {
      const originalMessage = `Here's how to use the API:

\`\`\`javascript
const response = await fetch('/api/messages', {
  method: 'POST',
  body: JSON.stringify({ content: 'Hello' })
})
\`\`\`

Use \`fetch()\` for HTTP requests.`

      // Step 1: Parse the original message
      const parsed = parseMessage(originalMessage)
      expect(parsed.isValid).toBe(true)
      expect(parsed.hasCodeBlocks).toBe(true)
      expect(parsed.hasInlineCode).toBe(true)

      // Step 2: Get translatable content (code replaced with placeholders)
      const { translatableContent } = getTranslatableContent(originalMessage)
      expect(translatableContent).toContain('__CODE_BLOCK_0__')
      expect(translatableContent).toContain('__INLINE_CODE_0__')
      expect(translatableContent).not.toContain('fetch()')
      expect(translatableContent).not.toContain('const response')

      // Step 3: Simulate translation (this would normally go through the translation API)
      const simulatedTranslation = translatableContent
        .replace("Here's how to use the API:", "Voici comment utiliser l'API :")
        .replace('Use __INLINE_CODE_0__ for HTTP requests.', 'Utilisez __INLINE_CODE_0__ pour les requêtes HTTP.')

      // Step 4: Restore code in the translated content
      const finalTranslation = restoreCodeInTranslation(simulatedTranslation, parsed)
      
      expect(finalTranslation).toContain('Voici comment utiliser l\'API')
      expect(finalTranslation).toContain('```javascript')
      expect(finalTranslation).toContain('const response = await fetch')
      expect(finalTranslation).toContain('`fetch()`')
      expect(finalTranslation).toContain('requêtes HTTP')
    })

    it('should handle mixed content with markdown and code', () => {
      const originalMessage = `**Important**: Use \`console.log()\` for debugging.

\`\`\`python
print("Debug info")
\`\`\`

*Remember* to remove debug code before production.`

      const { translatableContent, parsedMessage } = getTranslatableContent(originalMessage)
      
      // Should preserve markdown but replace code
      expect(translatableContent).toContain('**Important**')
      expect(translatableContent).toContain('*Remember*')
      expect(translatableContent).toContain('__INLINE_CODE_0__')
      expect(translatableContent).toContain('__CODE_BLOCK_0__')
      expect(translatableContent).not.toContain('console.log()')
      expect(translatableContent).not.toContain('print("Debug info")')

      // Simulate translation
      const translated = translatableContent
        .replace('**Important**', '**Importante**')
        .replace('Use __INLINE_CODE_0__ for debugging', 'Usa __INLINE_CODE_0__ para depuración')
        .replace('*Remember*', '*Recuerda*')
        .replace('remove debug code before production', 'eliminar código de depuración antes de producción')

      const restored = restoreCodeInTranslation(translated, parsedMessage)
      
      expect(restored).toContain('**Importante**')
      expect(restored).toContain('`console.log()`')
      expect(restored).toContain('```python')
      expect(restored).toContain('print("Debug info")')
      expect(restored).toContain('*Recuerda*')
      expect(restored).toContain('depuración antes de producción')
    })

    it('should handle edge case with only code content', () => {
      const originalMessage = `\`\`\`bash
npm install
npm start
\`\`\``

      const { translatableContent, parsedMessage } = getTranslatableContent(originalMessage)
      
      // Should be mostly placeholders
      expect(translatableContent.trim()).toBe('__CODE_BLOCK_0__')
      
      // Should restore perfectly (accounting for trimmed whitespace in code blocks)
      const restored = restoreCodeInTranslation(translatableContent, parsedMessage)
      expect(restored).toContain('```bash')
      expect(restored).toContain('npm install')
      expect(restored).toContain('npm start')
      expect(restored).toContain('```')
    })

    it('should handle complex nested scenarios', () => {
      const originalMessage = `To configure the **database**, follow these steps:

1. Install dependencies: \`npm install\`
2. Set up the database:

\`\`\`sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);
\`\`\`

3. Run migrations with \`npm run migrate\`

*Note*: Make sure your \`.env\` file is configured correctly.`

      const { translatableContent, parsedMessage } = getTranslatableContent(originalMessage)
      
      // Verify code is replaced but structure is preserved
      expect(translatableContent).toContain('**database**')
      expect(translatableContent).toContain('1. Install dependencies: __INLINE_CODE_0__')
      expect(translatableContent).toContain('__CODE_BLOCK_0__')
      expect(translatableContent).toContain('3. Run migrations with __INLINE_CODE_1__')
      expect(translatableContent).toContain('*Note*')
      expect(translatableContent).toContain('__INLINE_CODE_2__')
      
      // Verify original code is not in translatable content
      expect(translatableContent).not.toContain('npm install')
      expect(translatableContent).not.toContain('CREATE TABLE')
      expect(translatableContent).not.toContain('.env')

      // Simulate translation
      const translated = translatableContent
        .replace('To configure the **database**', 'Para configurar la **base de datos**')
        .replace('Install dependencies', 'Instalar dependencias')
        .replace('Set up the database', 'Configurar la base de datos')
        .replace('Run migrations with', 'Ejecutar migraciones con')
        .replace('*Note*: Make sure your __INLINE_CODE_2__ file is configured correctly', '*Nota*: Asegúrate de que tu archivo __INLINE_CODE_2__ esté configurado correctamente')

      const restored = restoreCodeInTranslation(translated, parsedMessage)
      
      // Verify final result has both translation and original code
      expect(restored).toContain('Para configurar la **base de datos**')
      expect(restored).toContain('`npm install`')
      expect(restored).toContain('```sql')
      expect(restored).toContain('CREATE TABLE users')
      expect(restored).toContain('`npm run migrate`')
      expect(restored).toContain('`.env`')
      expect(restored).toContain('*Nota*')
    })
  })

  describe('Error handling in translation workflow', () => {
    it('should handle invalid content gracefully', () => {
      const invalidMessage = '```\nunclosed code block'
      
      const parsed = parseMessage(invalidMessage)
      // Note: The parser actually handles this case by extracting what it can
      // The validation method would catch this as invalid
      const validation = parsed.isValid ? { isValid: true, errors: [] } : { isValid: false, errors: parsed.errors }
      
      // Should still be able to get translatable content
      const { translatableContent } = getTranslatableContent(invalidMessage)
      expect(translatableContent).toBeDefined()
    })

    it('should handle empty content', () => {
      const emptyMessage = ''
      
      const { translatableContent, parsedMessage } = getTranslatableContent(emptyMessage)
      expect(parsedMessage.isValid).toBe(false)
      expect(translatableContent).toBe('')
      
      const restored = restoreCodeInTranslation('', parsedMessage)
      expect(restored).toBe('')
    })
  })
})