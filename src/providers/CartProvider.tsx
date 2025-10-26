'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CartModalContextType {
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartModalContext = createContext<CartModalContextType | undefined>(undefined)

export function CartModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openCart = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeCart = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleCart = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return (
    <CartModalContext.Provider
      value={{
        isOpen,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartModalContext.Provider>
  )
}

export function useCartModal() {
  const context = useContext(CartModalContext)
  if (context === undefined) {
    throw new Error('useCartModal must be used within a CartModalProvider')
  }
  return context
}