/**
 * Input validation and sanitization utilities
 * Protects against injection attacks and malformed data
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate phone number (basic format)
 */
export function validatePhone(phone: string): boolean {
  if (typeof phone !== 'string') return false
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Check if it's a valid US phone number (10 digits)
  return cleanPhone.length === 10 || cleanPhone.length === 11
}

/**
 * Validate monetary amount (prevent negative values, excessive precision)
 */
export function validateAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) return false
  
  // Must be positive
  if (amount < 0) return false
  
  // Maximum reasonable amount for a cafe order
  if (amount > 10000) return false
  
  // Check decimal precision (max 2 decimal places)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  return decimalPlaces <= 2
}

/**
 * Validate and sanitize SQL-like identifiers
 */
export function validateIdentifier(id: string): boolean {
  if (typeof id !== 'string') return false
  
  // Only allow alphanumeric, underscore, hyphen
  const identifierRegex = /^[a-zA-Z0-9_-]+$/
  return identifierRegex.test(id) && id.length <= 50
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  if (typeof uuid !== 'string') return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Sanitize and validate JSON input
 */
export function validateJSON(input: string, maxSize = 10000): unknown {
  if (typeof input !== 'string') {
    throw new Error('JSON input must be a string')
  }
  
  if (input.length > maxSize) {
    throw new Error('JSON input too large')
  }
  
  try {
    return JSON.parse(input)
  } catch {
    throw new Error('Invalid JSON format')
  }
}

/**
 * Validate order item structure
 */
export function validateOrderItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false
  const candidate = item as Record<string, unknown>
 
  const quantity = typeof candidate.quantity === 'number' ? candidate.quantity : NaN
  const price = typeof candidate.price === 'number' ? candidate.price : NaN

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Number.isFinite(quantity) &&
    Number.isFinite(price) &&
    quantity > 0 &&
    quantity <= 100 &&
    validateAmount(price)
  )
}

/**
 * Validate customer information
 */
export function validateCustomerInfo(customer: unknown): boolean {
  if (!customer || typeof customer !== 'object') return false
  const person = customer as Record<string, unknown>
  
  const phone = typeof person.phone === 'string' ? person.phone : undefined

  return (
    typeof person.email === 'string' &&
    validateEmail(person.email) &&
    typeof person.name === 'string' &&
    person.name.length >= 1 &&
    person.name.length <= 100 &&
    (!phone || validatePhone(phone))
  )
}

/**
 * Common validation errors
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate request body against schema
 */
export function validateRequestBody(body: unknown, schema: Record<string, (value: unknown) => boolean>): void {
  for (const [field, validator] of Object.entries(schema)) {
    const value = (body && typeof body === 'object' && field in body) ? (body as Record<string, unknown>)[field] : undefined
    if (!validator(value)) {
      throw new ValidationError(`Invalid ${field}`, field)
    }
  }
}
