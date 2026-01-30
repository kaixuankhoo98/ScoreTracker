import { randomBytes } from 'crypto'

// Generate a URL-friendly slug from a name
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  // Add random suffix for uniqueness
  const suffix = randomBytes(3).toString('hex')

  return `${base}-${suffix}`
}

// Validate and parse pagination params
export function getPagination(
  page?: string | number,
  limit?: string | number
): { skip: number; take: number } {
  const parsedPage = Math.max(1, parseInt(String(page ?? '1'), 10) || 1)
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit ?? '20'), 10) || 20))

  return {
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
  }
}
