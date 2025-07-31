'use client'

import { useEffect } from 'react'

interface KeyboardNavigationOptions {
  onEscape?: () => void
  onEnter?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onTab?: () => void
  onShiftTab?: () => void
  disabled?: boolean
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    disabled = false
  } = options

  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onEscape?.()
          break
        case 'Enter':
          if (event.target === document.activeElement) {
            event.preventDefault()
            onEnter?.()
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          onArrowUp?.()
          break
        case 'ArrowDown':
          event.preventDefault()
          onArrowDown?.()
          break
        case 'ArrowLeft':
          event.preventDefault()
          onArrowLeft?.()
          break
        case 'ArrowRight':
          event.preventDefault()
          onArrowRight?.()
          break
        case 'Tab':
          if (event.shiftKey) {
            onShiftTab?.()
          } else {
            onTab?.()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    disabled
  ])
}

// Global keyboard shortcuts
export const useGlobalKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault()
            // Focus search if it exists
            const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
            }
            break
          case '/':
            event.preventDefault()
            // Focus search if it exists  
            const searchInput2 = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
            if (searchInput2) {
              searchInput2.focus()
            }
            break
        }
      }

      // Non-modifier shortcuts
      switch (event.key) {
        case '/':
          if (!event.ctrlKey && !event.metaKey) {
            // Check if not in an input field
            const activeElement = document.activeElement
            if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
              event.preventDefault()
              const searchInput = document.querySelector('input[placeholder*="search" i]') as HTMLInputElement
              if (searchInput) {
                searchInput.focus()
              }
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}