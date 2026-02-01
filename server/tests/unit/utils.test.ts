import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateSlug, getPagination } from '../../src/utils.js'

describe('utils', () => {
  describe('generateSlug', () => {
    beforeEach(() => {
      // Mock randomBytes for deterministic tests
      vi.mock('crypto', () => ({
        randomBytes: vi.fn(() => Buffer.from('abc123', 'hex')),
      }))
    })

    it('converts name to lowercase', () => {
      const slug = generateSlug('My Tournament')
      expect(slug.startsWith('my-tournament-')).toBe(true)
    })

    it('removes special characters', () => {
      const slug = generateSlug("Test's Tournament!")
      expect(slug).not.toContain("'")
      expect(slug).not.toContain('!')
    })

    it('replaces spaces with hyphens', () => {
      const slug = generateSlug('Test Tournament Name')
      expect(slug.startsWith('test-tournament-name-')).toBe(true)
    })

    it('removes consecutive hyphens', () => {
      const slug = generateSlug('Test   Multiple   Spaces')
      expect(slug).not.toContain('--')
    })

    it('removes leading and trailing hyphens from base', () => {
      const slug = generateSlug('  -Test Tournament-  ')
      expect(slug.startsWith('test-tournament-')).toBe(true)
    })

    it('adds a random suffix for uniqueness', () => {
      const slug = generateSlug('Test')
      // Slug should have format: base-randomsuffix
      const parts = slug.split('-')
      expect(parts.length).toBeGreaterThanOrEqual(2)
      // Last part should be the random suffix (hex string)
      const suffix = parts[parts.length - 1]
      expect(suffix).toBeDefined()
      expect(suffix!.length).toBe(6) // 3 bytes = 6 hex chars
    })

    it('handles empty string', () => {
      const slug = generateSlug('')
      // Should just be the random suffix with leading hyphen
      expect(slug.length).toBeGreaterThan(0)
    })

    it('handles strings with only special characters', () => {
      const slug = generateSlug('!!!@@@###')
      // Should produce something with just the suffix
      expect(slug.length).toBeGreaterThan(0)
    })
  })

  describe('getPagination', () => {
    it('returns default values when no params provided', () => {
      const result = getPagination()
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('calculates correct skip for page 1', () => {
      const result = getPagination('1', '20')
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('calculates correct skip for page 2', () => {
      const result = getPagination('2', '20')
      expect(result).toEqual({ skip: 20, take: 20 })
    })

    it('calculates correct skip for page 3 with limit 10', () => {
      const result = getPagination('3', '10')
      expect(result).toEqual({ skip: 20, take: 10 })
    })

    it('enforces minimum page of 1', () => {
      const result = getPagination('0', '20')
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('enforces minimum page of 1 for negative values', () => {
      const result = getPagination('-5', '20')
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('enforces minimum limit of 1', () => {
      // 0 is falsy, so it falls back to default of 20, then gets clamped
      // The min(100, max(1, parseInt('0') || 20)) = min(100, max(1, 20)) = 20
      const result = getPagination('1', '0')
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('enforces minimum limit of 1 for negative values', () => {
      // -5 is truthy, so max(1, -5) = 1
      const result = getPagination('1', '-5')
      expect(result).toEqual({ skip: 0, take: 1 })
    })

    it('enforces maximum limit of 100', () => {
      const result = getPagination('1', '500')
      expect(result).toEqual({ skip: 0, take: 100 })
    })

    it('handles string inputs', () => {
      const result = getPagination('2', '15')
      expect(result).toEqual({ skip: 15, take: 15 })
    })

    it('handles number inputs', () => {
      const result = getPagination(2, 15)
      expect(result).toEqual({ skip: 15, take: 15 })
    })

    it('handles invalid string page - defaults to 1', () => {
      const result = getPagination('invalid', '20')
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('handles invalid string limit - defaults to 20', () => {
      const result = getPagination('1', 'invalid')
      expect(result).toEqual({ skip: 0, take: 20 })
    })

    it('handles undefined page', () => {
      const result = getPagination(undefined, '10')
      expect(result).toEqual({ skip: 0, take: 10 })
    })

    it('handles undefined limit', () => {
      const result = getPagination('2', undefined)
      expect(result).toEqual({ skip: 20, take: 20 })
    })

    it('handles NaN inputs gracefully', () => {
      const result = getPagination(NaN, NaN)
      expect(result).toEqual({ skip: 0, take: 20 })
    })
  })
})
