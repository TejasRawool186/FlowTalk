// Enhanced Glossary Manager Service with Proper Noun and Brand Name Protection

import { GlossaryManager } from './interfaces'
import { GlossaryTerm } from '@/types'
import { handleError } from '@/lib/errors'

export interface ProtectedTerm {
  term: string
  category: 'technical' | 'brand' | 'proper_noun' | 'custom'
  romanizedVariants?: string[]
  preserveCase: boolean
}

export interface ProtectedContent {
  processedContent: string
  protectedSegments: Array<{
    original: string
    placeholder: string
    position: number
  }>
}

export class GlossaryManagerImpl implements GlossaryManager {
  private defaultGlossary: ProtectedTerm[] = [
    // Technical terms
    { term: 'API', category: 'technical', preserveCase: true },
    { term: 'HTTP', category: 'technical', preserveCase: true },
    { term: 'HTTPS', category: 'technical', preserveCase: true },
    { term: 'REST', category: 'technical', preserveCase: true },
    { term: 'JSON', category: 'technical', preserveCase: true },
    { term: 'XML', category: 'technical', preserveCase: true },
    { term: 'SQL', category: 'technical', preserveCase: true },
    { term: 'NoSQL', category: 'technical', preserveCase: true },
    { term: 'GraphQL', category: 'technical', preserveCase: true },
    { term: 'WebSocket', category: 'technical', preserveCase: true },
    { term: 'OAuth', category: 'technical', preserveCase: true },
    { term: 'JWT', category: 'technical', preserveCase: true },
    { term: 'SSL', category: 'technical', preserveCase: true },
    { term: 'TLS', category: 'technical', preserveCase: true },
    { term: 'DNS', category: 'technical', preserveCase: true },
    { term: 'CDN', category: 'technical', preserveCase: true },
    { term: 'SDK', category: 'technical', preserveCase: true },
    { term: 'CLI', category: 'technical', preserveCase: true },
    { term: 'GUI', category: 'technical', preserveCase: true },
    { term: 'UI', category: 'technical', preserveCase: true },
    { term: 'UX', category: 'technical', preserveCase: true },
    
    // Brand names - Development Tools
    { term: 'GitHub', category: 'brand', preserveCase: true },
    { term: 'GitLab', category: 'brand', preserveCase: true },
    { term: 'Bitbucket', category: 'brand', preserveCase: true },
    { term: 'Supabase', category: 'brand', preserveCase: true },
    { term: 'Firebase', category: 'brand', preserveCase: true },
    { term: 'MongoDB', category: 'brand', preserveCase: true },
    { term: 'PostgreSQL', category: 'brand', preserveCase: true },
    { term: 'MySQL', category: 'brand', preserveCase: true },
    { term: 'Redis', category: 'brand', preserveCase: true },
    { term: 'Docker', category: 'brand', preserveCase: true },
    { term: 'Kubernetes', category: 'brand', preserveCase: true },
    { term: 'AWS', category: 'brand', preserveCase: true },
    { term: 'Azure', category: 'brand', preserveCase: true },
    { term: 'Google Cloud', category: 'brand', preserveCase: true },
    { term: 'Vercel', category: 'brand', preserveCase: true },
    { term: 'Netlify', category: 'brand', preserveCase: true },
    { term: 'Heroku', category: 'brand', preserveCase: true },
    
    // Brand names - Frameworks & Libraries
    { term: 'React', category: 'brand', preserveCase: true },
    { term: 'Vue', category: 'brand', preserveCase: true },
    { term: 'Angular', category: 'brand', preserveCase: true },
    { term: 'Next.js', category: 'brand', preserveCase: true },
    { term: 'Nuxt', category: 'brand', preserveCase: true },
    { term: 'Svelte', category: 'brand', preserveCase: true },
    { term: 'Node.js', category: 'brand', preserveCase: true },
    { term: 'Express', category: 'brand', preserveCase: true },
    { term: 'Django', category: 'brand', preserveCase: true },
    { term: 'Flask', category: 'brand', preserveCase: true },
    { term: 'Laravel', category: 'brand', preserveCase: true },
    { term: 'Spring', category: 'brand', preserveCase: true },
    { term: 'TailwindCSS', category: 'brand', preserveCase: true },
    { term: 'Bootstrap', category: 'brand', preserveCase: true },
    
    // Brand names - Communication & Collaboration
    { term: 'Discord', category: 'brand', preserveCase: true },
    { term: 'Slack', category: 'brand', preserveCase: true },
    { term: 'Teams', category: 'brand', preserveCase: true },
    { term: 'Zoom', category: 'brand', preserveCase: true },
    { term: 'Notion', category: 'brand', preserveCase: true },
    { term: 'Jira', category: 'brand', preserveCase: true },
    { term: 'Trello', category: 'brand', preserveCase: true },
    { term: 'Asana', category: 'brand', preserveCase: true },
    
    // Brand names - Payment & Services
    { term: 'Stripe', category: 'brand', preserveCase: true },
    { term: 'PayPal', category: 'brand', preserveCase: true },
    { term: 'Shopify', category: 'brand', preserveCase: true },
    { term: 'Twilio', category: 'brand', preserveCase: true },
    { term: 'SendGrid', category: 'brand', preserveCase: true },
    
    // Programming Languages
    { term: 'JavaScript', category: 'technical', preserveCase: true },
    { term: 'TypeScript', category: 'technical', preserveCase: true },
    { term: 'Python', category: 'technical', preserveCase: true },
    { term: 'Java', category: 'technical', preserveCase: true },
    { term: 'C++', category: 'technical', preserveCase: true },
    { term: 'C#', category: 'technical', preserveCase: true },
    { term: 'Go', category: 'technical', preserveCase: true },
    { term: 'Rust', category: 'technical', preserveCase: true },
    { term: 'PHP', category: 'technical', preserveCase: true },
    { term: 'Ruby', category: 'technical', preserveCase: true },
    { term: 'Swift', category: 'technical', preserveCase: true },
    { term: 'Kotlin', category: 'technical', preserveCase: true }
  ]

  private communityTerms: Map<string, ProtectedTerm[]> = new Map()
  private properNounPatterns: RegExp[] = [
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g, // Capitalized words (names)
    /\b[A-Z]{2,}\b/g, // All caps acronyms
    /\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b/g // CamelCase
  ]
  /**
   * Get protected terms for a community
   */
  async getProtectedTerms(communityId: string): Promise<string[]> {
    try {
      const communityTerms = this.communityTerms.get(communityId) || []
      const allTerms = [...this.defaultGlossary, ...communityTerms]
      
      // Return unique terms
      return Array.from(new Set(allTerms.map(t => t.term)))
    } catch (error) {
      throw handleError(error, 'GlossaryManager.getProtectedTerms')
    }
  }

  /**
   * Add a protected term to a community
   */
  async addProtectedTerm(communityId: string, term: string): Promise<void> {
    try {
      const existingTerms = this.communityTerms.get(communityId) || []
      
      // Check if term already exists
      if (existingTerms.some(t => t.term.toLowerCase() === term.toLowerCase())) {
        return
      }

      const newTerm: ProtectedTerm = {
        term,
        category: 'custom',
        preserveCase: this.shouldPreserveCase(term)
      }

      this.communityTerms.set(communityId, [...existingTerms, newTerm])
    } catch (error) {
      throw handleError(error, 'GlossaryManager.addProtectedTerm')
    }
  }

  /**
   * Apply glossary protection to content
   */
  applyGlossaryProtection(content: string, terms: string[]): string {
    try {
      let protectedContent = content

      // Sort terms by length (longest first) to avoid partial replacements
      const sortedTerms = [...terms].sort((a, b) => b.length - a.length)

      for (const term of sortedTerms) {
        // Create case-insensitive regex with word boundaries
        const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi')
        
        // Replace with placeholder that preserves the original term
        protectedContent = protectedContent.replace(regex, (match) => {
          return `__PROTECTED_${match}_PROTECTED__`
        })
      }

      return protectedContent
    } catch (error) {
      throw handleError(error, 'GlossaryManager.applyGlossaryProtection')
    }
  }

  /**
   * Get default glossary terms
   */
  getDefaultGlossary(): string[] {
    return this.defaultGlossary.map(t => t.term)
  }

  /**
   * Remove a protected term from a community
   */
  async removeProtectedTerm(communityId: string, term: string): Promise<void> {
    try {
      const existingTerms = this.communityTerms.get(communityId) || []
      const filteredTerms = existingTerms.filter(
        t => t.term.toLowerCase() !== term.toLowerCase()
      )
      this.communityTerms.set(communityId, filteredTerms)
    } catch (error) {
      throw handleError(error, 'GlossaryManager.removeProtectedTerm')
    }
  }

  /**
   * Get custom terms for a community
   */
  async getCustomTerms(communityId: string): Promise<GlossaryTerm[]> {
    try {
      const terms = this.communityTerms.get(communityId) || []
      return terms.map((t, index) => ({
        id: `${communityId}-${index}`,
        communityId,
        term: t.term,
        createdBy: 'admin',
        createdAt: new Date()
      }))
    } catch (error) {
      throw handleError(error, 'GlossaryManager.getCustomTerms')
    }
  }

  /**
   * Restore protected terms in translated content
   */
  restoreProtectedTerms(content: string, originalContent: string): string {
    try {
      let restoredContent = content

      // Find all protected placeholders
      const placeholderRegex = /__PROTECTED_(.+?)_PROTECTED__/g
      const matches = content.matchAll(placeholderRegex)

      for (const match of matches) {
        const originalTerm = match[1]
        restoredContent = restoredContent.replace(match[0], originalTerm)
      }

      return restoredContent
    } catch (error) {
      throw handleError(error, 'GlossaryManager.restoreProtectedTerms')
    }
  }

  /**
   * Check if a term is protected
   */
  async isTermProtected(communityId: string, term: string): Promise<boolean> {
    try {
      const protectedTerms = await this.getProtectedTerms(communityId)
      return protectedTerms.some(t => t.toLowerCase() === term.toLowerCase())
    } catch (error) {
      throw handleError(error, 'GlossaryManager.isTermProtected')
    }
  }

  /**
   * Add multiple terms at once
   */
  async addMultipleTerms(communityId: string, terms: string[]): Promise<void> {
    try {
      for (const term of terms) {
        await this.addProtectedTerm(communityId, term)
      }
    } catch (error) {
      throw handleError(error, 'GlossaryManager.addMultipleTerms')
    }
  }

  /**
   * Search for terms
   */
  async searchTerms(communityId: string, query: string): Promise<string[]> {
    try {
      const allTerms = await this.getProtectedTerms(communityId)
      const lowerQuery = query.toLowerCase()
      
      return allTerms.filter(term => 
        term.toLowerCase().includes(lowerQuery)
      )
    } catch (error) {
      throw handleError(error, 'GlossaryManager.searchTerms')
    }
  }

  /**
   * Identify proper nouns in content
   */
  async identifyProperNouns(content: string): Promise<string[]> {
    try {
      const properNouns = new Set<string>()

      for (const pattern of this.properNounPatterns) {
        const matches = content.matchAll(pattern)
        for (const match of matches) {
          properNouns.add(match[0])
        }
      }

      return Array.from(properNouns)
    } catch (error) {
      throw handleError(error, 'GlossaryManager.identifyProperNouns')
    }
  }

  /**
   * Expand default glossary with additional terms
   */
  async expandDefaultGlossary(): Promise<ProtectedTerm[]> {
    try {
      return [...this.defaultGlossary]
    } catch (error) {
      throw handleError(error, 'GlossaryManager.expandDefaultGlossary')
    }
  }

  /**
   * Apply glossary protection with detailed tracking
   */
  async applyGlossaryProtectionDetailed(
    content: string,
    terms: ProtectedTerm[]
  ): Promise<ProtectedContent> {
    try {
      let processedContent = content
      const protectedSegments: ProtectedContent['protectedSegments'] = []

      // Sort terms by length (longest first)
      const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length)

      for (const termObj of sortedTerms) {
        const regex = new RegExp(`\\b${this.escapeRegex(termObj.term)}\\b`, 'gi')
        const matches = processedContent.matchAll(regex)

        for (const match of matches) {
          if (match.index !== undefined) {
            const placeholder = `__PROTECTED_${protectedSegments.length}__`
            
            protectedSegments.push({
              original: match[0],
              placeholder,
              position: match.index
            })

            processedContent = processedContent.replace(match[0], placeholder)
          }
        }
      }

      return {
        processedContent,
        protectedSegments
      }
    } catch (error) {
      throw handleError(error, 'GlossaryManager.applyGlossaryProtectionDetailed')
    }
  }

  /**
   * Helper: Determine if term should preserve case
   */
  private shouldPreserveCase(term: string): boolean {
    // Preserve case if:
    // 1. All uppercase (acronym)
    // 2. Has mixed case (CamelCase or brand name)
    // 3. Starts with capital letter
    return /^[A-Z]+$/.test(term) || 
           /[A-Z]/.test(term.slice(1)) || 
           /^[A-Z]/.test(term)
  }

  /**
   * Helper: Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Legacy methods for backward compatibility
  async getGlossaryTerms(language: string): Promise<GlossaryTerm[]> {
    return this.defaultGlossary.map((t, index) => ({
      id: `default-${index}`,
      communityId: 'default',
      term: t.term,
      createdBy: 'system',
      createdAt: new Date()
    }))
  }

  async addGlossaryTerm(term: Omit<GlossaryTerm, 'id' | 'createdAt'>): Promise<GlossaryTerm> {
    return {
      id: Date.now().toString(),
      ...term,
      createdAt: new Date()
    }
  }

  async updateGlossaryTerm(id: string, updates: Partial<GlossaryTerm>): Promise<GlossaryTerm> {
    return {
      id,
      communityId: updates.communityId || 'default',
      term: updates.term || '',
      createdBy: updates.createdBy || 'system',
      createdAt: new Date()
    }
  }

  async deleteGlossaryTerm(id: string): Promise<void> {
    console.log('Deleting glossary term:', id)
  }

  async searchGlossaryTerms(query: string, language?: string): Promise<GlossaryTerm[]> {
    const terms = await this.getGlossaryTerms(language || 'en')
    return terms.filter(term => 
      term.term.toLowerCase().includes(query.toLowerCase())
    )
  }
}