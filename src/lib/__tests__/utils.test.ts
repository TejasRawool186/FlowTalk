// Test file to verify the testing setup works

import { generateHash, hasCodeBlocks, extractCodeBlocks } from '../utils'

describe('Utils', () => {
  describe('generateHash', () => {
    it('should generate consistent hashes for the same input', () => {
      const content = 'Hello, world!'
      const hash1 = generateHash(content)
      const hash2 = generateHash(content)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64-character hex strings
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = generateHash('Hello')
      const hash2 = generateHash('World')
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('hasCodeBlocks', () => {
    it('should detect inline code blocks', () => {
      expect(hasCodeBlocks('This is `inline code`')).toBe(true)
      expect(hasCodeBlocks('No code here')).toBe(false)
    })

    it('should detect multi-line code blocks', () => {
      expect(hasCodeBlocks('```\ncode block\n```')).toBe(true)
      expect(hasCodeBlocks('```javascript\nconsole.log("hello")\n```')).toBe(true)
    })
  })

  describe('extractCodeBlocks', () => {
    it('should extract inline code blocks', () => {
      const content = 'Use `console.log()` to debug'
      const blocks = extractCodeBlocks(content)
      
      expect(blocks).toEqual(['`console.log()`'])
    })

    it('should extract multi-line code blocks', () => {
      const content = 'Here is code:\n```\nfunction test() {\n  return true;\n}\n```'
      const blocks = extractCodeBlocks(content)
      
      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toContain('function test()')
    })

    it('should return empty array when no code blocks exist', () => {
      const content = 'Just regular text'
      const blocks = extractCodeBlocks(content)
      
      expect(blocks).toEqual([])
    })
  })
})