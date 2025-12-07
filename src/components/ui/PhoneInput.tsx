'use client'

import { useCallback } from 'react'
import Input from './Input'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  'data-testid'?: string
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = "(555) 123-4567",
  className,
  required = false,
  disabled = false,
  'data-testid': testId,
}: PhoneInputProps) {
  const formatPhoneNumber = useCallback((input: string) => {
    // Remove all non-numeric characters
    const numeric = input.replace(/\D/g, '')
    
    // Limit to 10 digits
    const truncated = numeric.slice(0, 10)
    
    // Format based on length
    if (truncated.length === 0) return ''
    if (truncated.length <= 3) return `(${truncated}`
    if (truncated.length <= 6) return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const formatted = formatPhoneNumber(inputValue)
    onChange(formatted)
  }, [formatPhoneNumber, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace to work naturally
    if (e.key === 'Backspace') {
      const input = e.currentTarget
      const selectionStart = input.selectionStart || 0
      const selectionEnd = input.selectionEnd || 0
      
      // If cursor is after a formatting character, move it back
      if (selectionStart === selectionEnd) {
        const char = value[selectionStart - 1]
        if (char === ')' || char === ' ' || char === '-') {
          e.preventDefault()
          const newValue = value.slice(0, selectionStart - 2) + value.slice(selectionStart)
          const formatted = formatPhoneNumber(newValue)
          onChange(formatted)
        }
      }
    }
  }, [value, formatPhoneNumber, onChange])

  // Validate phone number format
  const isValid = useCallback((phone: string) => {
    const numeric = phone.replace(/\D/g, '')
    return numeric.length === 10
  }, [])

  const getNumericValue = useCallback(() => {
    return value.replace(/\D/g, '')
  }, [value])

  return (
    <Input
      type="tel"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
      maxLength={14} // (xxx) xxx-xxxx = 14 characters
      data-testid={testId}
      data-valid={isValid(value)}
      data-numeric={getNumericValue()}
    />
  )
}
