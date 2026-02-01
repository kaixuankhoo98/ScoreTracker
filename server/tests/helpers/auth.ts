import bcrypt from 'bcrypt'

// Pre-computed hash for "admin123" - used in tests for speed
// Generated with: bcrypt.hashSync('admin123', 10)
export const TEST_PASSWORD = 'admin123'
export const TEST_PASSWORD_HASH = '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33OivJR9P5VO7Cgw/c9XEFO'

// Generate a real bcrypt hash (use sparingly - it's slow)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Create admin auth header
export function adminAuthHeader(password: string = TEST_PASSWORD): Record<string, string> {
  return {
    'x-tournament-password': password,
  }
}

// Create headers object with optional admin password
export function createHeaders(options: { adminPassword?: string } = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.adminPassword !== undefined) {
    headers['x-tournament-password'] = options.adminPassword
  }
  return headers
}
