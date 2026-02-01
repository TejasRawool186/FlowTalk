// Unit tests for GlossaryManager

import { GlossaryManagerImpl } from '../GlossaryManager'
import { supabase } from '@/lib/supabase'
import { ValidationError, DatabaseError } from '@/lib/errors'
import { DEFAULT_GLOSSARY_TERMS } from '@/lib/constants'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('GlossaryManager', () => {
  let glossaryManager: GlossaryManagerImpl
  
  beforeEach(() => {
    glossaryManager = new GlossaryManagerImpl()
    jest.clearAllMocks()
  })

  describe('getProtectedTerms', () => {
    const mockCommunityTerms = [
      { term: 'CustomTerm1' },
      { term: 'CustomTerm2' }
    ]

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockCommunityTerms,
            error: null
          })
        })
      } as any)
    })

    it('should return combined default and community terms', async () => {
      const result = await glossaryManager.getProtectedTerms('community-1')

      expect(result).toContain('API') // Default term
      expect(result).toContain('CustomTerm1') // Community term
      expect(result).toContain('CustomTerm2') // Community term
      expect(result.length).toBeGreaterThan(DEFAULT_GLOSSARY_TERMS.length)
    })

    it('should remove duplicates and sort terms', async () => {
      const duplicateTerms = [
        { term: 'API' }, // Duplicate of default term
        { term: 'CustomTerm' }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: duplicateTerms,
            error: null
          })
        })
      } as any)

      const result = await glossaryManager.getProtectedTerms('community-1')

      // Should not have duplicates
      const apiCount = result.filter(term => term === 'API').length
      expect(apiCount).toBe(1)

      // Should be sorted
      const sortedResult = [...result].sort()
      expect(result).toEqual(sortedResult)
    })

    it('should validate community ID', async () => {
      await expect(glossaryManager.getProtectedTerms(''))
        .rejects.toThrow(ValidationError)
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any)

      await expect(glossaryManager.getProtectedTerms('community-1'))
        .rejects.toThrow(DatabaseError)
    })

    it('should cache results', async () => {
      // First call
      await glossaryManager.getProtectedTerms('community-1')
      
      // Second call should use cache
      await glossaryManager.getProtectedTerms('community-1')

      // Database should only be called once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)
    })
  })

  describe('addProtectedTerm', () => {
    const mockUser = { id: 'user-1' }

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any)

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)
    })

    it('should add a new term successfully', async () => {
      await glossaryManager.addProtectedTerm('community-1', 'NewTerm')

      expect(mockSupabase.from).toHaveBeenCalledWith('glossary_terms')
    })

    it('should validate required fields', async () => {
      await expect(glossaryManager.addProtectedTerm('', 'term'))
        .rejects.toThrow(ValidationError)

      await expect(glossaryManager.addProtectedTerm('community-1', ''))
        .rejects.toThrow(ValidationError)

      await expect(glossaryManager.addProtectedTerm('community-1', '   '))
        .rejects.toThrow(ValidationError)
    })

    it('should validate term length', async () => {
      const longTerm = 'a'.repeat(101)
      
      await expect(glossaryManager.addProtectedTerm('community-1', longTerm))
        .rejects.toThrow(ValidationError)
    })

    it('should validate term format', async () => {
      await expect(glossaryManager.addProtectedTerm('community-1', 'term@#$'))
        .rejects.toThrow(ValidationError)
    })

    it('should trim whitespace from terms', async () => {
      await glossaryManager.addProtectedTerm('community-1', '  NewTerm  ')

      expect(mockSupabase.from).toHaveBeenCalledWith('glossary_terms')
      // The insert should be called with trimmed term
    })

    it('should skip adding default terms', async () => {
      await glossaryManager.addProtectedTerm('community-1', 'API')

      // Should not call database since API is a default term
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should handle duplicate terms gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { code: '23505' } // Unique constraint violation
        })
      } as any)

      // Should not throw error for duplicates
      await expect(glossaryManager.addProtectedTerm('community-1', 'ExistingTerm'))
        .resolves.not.toThrow()
    })

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      } as any)

      await expect(glossaryManager.addProtectedTerm('community-1', 'NewTerm'))
        .rejects.toThrow(ValidationError)
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Database error', code: 'OTHER_ERROR' }
        })
      } as any)

      await expect(glossaryManager.addProtectedTerm('community-1', 'NewTerm'))
        .rejects.toThrow(DatabaseError)
    })
  })

  describe('getDefaultGlossary', () => {
    it('should return default glossary terms', () => {
      const result = glossaryManager.getDefaultGlossary()

      expect(result).toEqual(DEFAULT_GLOSSARY_TERMS)
      expect(result).toContain('API')
      expect(result).toContain('GitHub')
      expect(result).toContain('React')
    })

    it('should return a copy of the array', () => {
      const result1 = glossaryManager.getDefaultGlossary()
      const result2 = glossaryManager.getDefaultGlossary()

      expect(result1).not.toBe(result2) // Different array instances
      expect(result1).toEqual(result2) // Same content
    })
  })

  describe('applyGlossaryProtection', () => {
    const protectedTerms = ['API', 'GitHub', 'React', 'CustomTerm']

    it('should protect terms in content', () => {
      const content = 'Check the API documentation on GitHub for React components'
      const result = glossaryManager.applyGlossaryProtection(content, protectedTerms)

      // Should contain placeholders instead of original terms
      expect(result).toContain('__GLOSSARY_TERM_')
      expect(result).not.toContain('API')
      expect(result).not.toContain('GitHub')
      expect(result).not.toContain('React')
    })

    it('should handle case-insensitive matching', () => {
      const content = 'Use the api and github integration'
      const result = glossaryManager.applyGlossaryProtection(content, protectedTerms)

      expect(result).toContain('__GLOSSARY_TERM_')
    })

    it('should only match whole words', () => {
      const content = 'The application uses APIs and GitHub repositories'
      const result = glossaryManager.applyGlossaryProtection(content, protectedTerms)

      // 'APIs' should not be protected (plural form)
      // 'GitHub' should be protected
      expect(result).toContain('APIs') // Should remain unchanged
      expect(result).toContain('__GLOSSARY_TERM_') // GitHub should be protected
    })

    it('should handle empty content', () => {
      const result = glossaryManager.applyGlossaryProtection('', protectedTerms)
      expect(result).toBe('')
    })

    it('should handle empty terms array', () => {
      const content = 'Some content with API and GitHub'
      const result = glossaryManager.applyGlossaryProtection(content, [])
      
      expect(result).toBe(content)
    })

    it('should preserve code blocks', () => {
      const content = 'Use ```javascript\nconst api = "GitHub API";\n``` for integration'
      const result = glossaryManager.applyGlossaryProtection(content, protectedTerms)

      // Code block should be preserved
      expect(result).toContain('```javascript')
      expect(result).toContain('const api = "GitHub API";')
    })

    it('should handle overlapping terms correctly', () => {
      const overlappingTerms = ['API', 'GitHub API']
      const content = 'Use the GitHub API for integration'
      const result = glossaryManager.applyGlossaryProtection(content, overlappingTerms)

      // Should handle longest match first
      expect(result).toContain('__GLOSSARY_TERM_')
    })

    it('should handle special characters in terms', () => {
      const specialTerms = ['Next.js', 'Node.js']
      const content = 'Use Next.js with Node.js for development'
      const result = glossaryManager.applyGlossaryProtection(content, specialTerms)

      expect(result).toContain('__GLOSSARY_TERM_')
    })
  })

  describe('removeProtectedTerm', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: null
            })
          })
        })
      } as any)
    })

    it('should remove a custom term successfully', async () => {
      await glossaryManager.removeProtectedTerm('community-1', 'CustomTerm')

      expect(mockSupabase.from).toHaveBeenCalledWith('glossary_terms')
    })

    it('should validate required fields', async () => {
      await expect(glossaryManager.removeProtectedTerm('', 'term'))
        .rejects.toThrow(ValidationError)

      await expect(glossaryManager.removeProtectedTerm('community-1', ''))
        .rejects.toThrow(ValidationError)
    })

    it('should prevent removal of default terms', async () => {
      await expect(glossaryManager.removeProtectedTerm('community-1', 'API'))
        .rejects.toThrow(ValidationError)
    })

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      await expect(glossaryManager.removeProtectedTerm('community-1', 'CustomTerm'))
        .rejects.toThrow(DatabaseError)
    })
  })

  describe('isTermProtected', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ term: 'CustomTerm' }],
            error: null
          })
        })
      } as any)
    })

    it('should return true for protected terms', async () => {
      const result = await glossaryManager.isTermProtected('community-1', 'API')
      expect(result).toBe(true)
    })

    it('should return true for custom terms', async () => {
      const result = await glossaryManager.isTermProtected('community-1', 'CustomTerm')
      expect(result).toBe(true)
    })

    it('should return false for unprotected terms', async () => {
      const result = await glossaryManager.isTermProtected('community-1', 'UnprotectedTerm')
      expect(result).toBe(false)
    })

    it('should handle case-insensitive comparison', async () => {
      const result = await glossaryManager.isTermProtected('community-1', 'api')
      expect(result).toBe(true)
    })

    it('should handle empty inputs gracefully', async () => {
      const result1 = await glossaryManager.isTermProtected('', 'term')
      const result2 = await glossaryManager.isTermProtected('community-1', '')
      
      expect(result1).toBe(false)
      expect(result2).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any)

      const result = await glossaryManager.isTermProtected('community-1', 'term')
      expect(result).toBe(false)
    })
  })

  describe('searchTerms', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { term: 'CustomAPI' },
              { term: 'MyAPI' }
            ],
            error: null
          })
        })
      } as any)
    })

    it('should search and return matching terms', async () => {
      const result = await glossaryManager.searchTerms('community-1', 'API')

      expect(result).toContain('API') // Default term
      expect(result).toContain('CustomAPI') // Custom term
      expect(result).toContain('MyAPI') // Custom term
    })

    it('should handle case-insensitive search', async () => {
      const result = await glossaryManager.searchTerms('community-1', 'api')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should limit results', async () => {
      const result = await glossaryManager.searchTerms('community-1', 'a')

      expect(result.length).toBeLessThanOrEqual(20)
    })

    it('should handle empty query', async () => {
      const result = await glossaryManager.searchTerms('community-1', '')

      expect(result).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any)

      const result = await glossaryManager.searchTerms('community-1', 'API')
      expect(result).toEqual([])
    })
  })
})