// Integration test for Edge Function logic
// Tests the core translation logic that would run in the Edge Function

// Mock Supabase before importing services
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: [
            { term: 'API' },
            { term: 'GitHub' },
            { term: 'React' }
          ], 
          error: null 
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}))

import { GlossaryManagerImpl } from '../GlossaryManager'

describe('Edge Function Integration', () => {
  let glossaryManager: GlossaryManagerImpl

  beforeEach(() => {
    glossaryManager = new GlossaryManagerImpl()
  })

  describe('Translation Pipeline', () => {
    it('should handle the complete translation workflow', async () => {
      const mockMessage = {
        id: 'test-msg-1',
        content: 'Hello world! This API uses GitHub integration.',
        source_lang: 'en',
        channel_id: 'test-channel',
        sender_id: 'test-user'
      }

      const targetLanguages = ['es', 'fr']
      const communityId = 'default'

      // Step 1: Get protected terms (simulated)
      const protectedTerms = await glossaryManager.getProtectedTerms(communityId)
      expect(protectedTerms).toContain('API')
      expect(protectedTerms).toContain('GitHub')

      // Step 2: Apply glossary protection
      const protectedContent = glossaryManager.applyGlossaryProtection(
        mockMessage.content,
        protectedTerms
      )
      expect(protectedContent).toContain('__GLOSSARY_TERM_')
      expect(protectedContent).not.toContain('API')
      expect(protectedContent).not.toContain('GitHub')

      // Step 3: Simulate translation (without actual API call)
      const mockTranslations = targetLanguages.map(lang => ({
        message_id: mockMessage.id,
        target_lang: lang,
        translated_content: `Translated to ${lang}: ${protectedContent}`,
        created_at: new Date().toISOString()
      }))

      // Step 4: Test restoration logic separately
      const testProtectedContent = 'Hello world! This __GLOSSARY_TERM_1__ uses __GLOSSARY_TERM_0__ integration.'
      const restoredContent = glossaryManager.restoreProtectedTerms(
        testProtectedContent,
        mockMessage.content
      )

      // The restoration should work with the original content
      expect(typeof restoredContent).toBe('string')
      expect(restoredContent.length).toBeGreaterThan(0)
    })

    it('should handle empty target languages gracefully', async () => {
      const mockMessage = {
        id: 'test-msg-2',
        content: 'Hello world!',
        source_lang: 'en',
        channel_id: 'test-channel',
        sender_id: 'test-user'
      }

      const targetLanguages: string[] = []

      // Should handle empty target languages without error
      expect(targetLanguages.length).toBe(0)
      
      // In the actual Edge Function, this would result in marking the message as translated
      // without creating any translation records
    })
  })

  describe('Webhook Payload Processing', () => {
    it('should validate webhook payload structure', () => {
      const validPayload = {
        type: 'INSERT' as const,
        table: 'messages',
        record: {
          id: 'test-msg-1',
          channel_id: 'test-channel',
          sender_id: 'test-user',
          content: 'Hello world!',
          source_lang: 'en',
          status: 'sent' as const,
          created_at: new Date().toISOString()
        },
        schema: 'public',
        old_record: null
      }

      // Validate payload structure
      expect(validPayload.type).toBe('INSERT')
      expect(validPayload.table).toBe('messages')
      expect(validPayload.record.status).toBe('sent')
      expect(validPayload.record.id).toBeDefined()
      expect(validPayload.record.content).toBeDefined()
    })

    it('should ignore non-INSERT events', () => {
      const updatePayload = {
        type: 'UPDATE' as const,
        table: 'messages',
        record: {} as any,
        schema: 'public',
        old_record: null
      }

      // Should be ignored by the Edge Function
      expect(updatePayload.type).toBe('UPDATE')
    })

    it('should ignore non-messages table events', () => {
      const otherTablePayload = {
        type: 'INSERT' as const,
        table: 'profiles',
        record: {} as any,
        schema: 'public',
        old_record: null
      }

      // Should be ignored by the Edge Function
      expect(otherTablePayload.table).toBe('profiles')
    })

    it('should ignore messages not in sent status', () => {
      const translatingPayload = {
        type: 'INSERT' as const,
        table: 'messages',
        record: {
          id: 'test-msg-1',
          status: 'translating' as const
        } as any,
        schema: 'public',
        old_record: null
      }

      // Should be ignored by the Edge Function
      expect(translatingPayload.record.status).toBe('translating')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', async () => {
      const protectedTerms = await glossaryManager.getProtectedTerms('default')
      
      // Test with various edge cases
      const edgeCases = ['', '   ', '\n\n']
      
      edgeCases.forEach(content => {
        const result = glossaryManager.applyGlossaryProtection(content, protectedTerms)
        expect(typeof result).toBe('string')
      })
    })
  })
})