'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import OnboardingTooltip from '../ui/OnboardingTooltip'

const onboardingSteps = [
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Use the navigation menu to explore different sections of our cafe.',
    targetSelector: 'nav[aria-label="Main navigation"], nav:first-of-type',
    position: 'bottom' as const
  },
  {
    id: 'menu-search',
    title: 'Search Menu',
    description: 'Quickly find menu items by searching. Press "/" to focus the search bar.',
    targetSelector: 'input[placeholder*="search" i]',
    position: 'bottom' as const
  },
  {
    id: 'cart',
    title: 'Shopping Cart',
    description: 'Add items to your cart and checkout when ready. Your cart count appears here.',
    targetSelector: 'a[href="/cart"], [title="View Cart"]',
    position: 'bottom' as const
  },
  {
    id: 'auth',
    title: 'Sign In',
    description: 'Create an account to save your preferences and view order history.',
    targetSelector: 'button:contains("Sign In"), [data-testid="sign-in"]',
    position: 'bottom' as const
  }
]

const homeOnboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Little Cafe!',
    description: 'Let us show you around. This tour will help you get started.',
    targetSelector: 'h1',
    position: 'bottom' as const
  },
  {
    id: 'menu-button',
    title: 'View Our Menu',
    description: 'Click here to browse our full menu with real-time pricing.',
    targetSelector: 'a[href="/menu"]',
    position: 'top' as const
  }
]

const menuOnboardingSteps = [
  {
    id: 'search',
    title: 'Search Menu Items',
    description: 'Use the search bar to quickly find specific items. Try searching for "coffee" or "sandwich".',
    targetSelector: 'input[placeholder*="search" i]',
    position: 'bottom' as const
  },
  {
    id: 'categories',
    title: 'Browse Categories',
    description: 'Menu items are organized by categories. Click to expand or collapse each section.',
    targetSelector: '[data-testid="menu-category"]:first-of-type, .menu-category:first-of-type',
    position: 'right' as const
  }
]

interface UserOnboardingProps {
  className?: string
}

const UserOnboarding = ({ className = '' }: UserOnboardingProps) => {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    // Check if user has seen onboarding
    const seen = localStorage.getItem('cafe-onboarding-completed')
    if (!seen) {
      setHasSeenOnboarding(false)
      // Show onboarding after a brief delay
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const getStepsForCurrentPage = () => {
    switch (pathname) {
      case '/':
        return homeOnboardingSteps
      case '/menu':
        return menuOnboardingSteps
      default:
        return onboardingSteps.filter(step => 
          !['menu-search'].includes(step.id) // Don't show menu search on non-menu pages
        )
    }
  }

  const handleComplete = () => {
    localStorage.setItem('cafe-onboarding-completed', 'true')
    setShowOnboarding(false)
    setHasSeenOnboarding(true)
  }

  const handleSkip = () => {
    localStorage.setItem('cafe-onboarding-completed', 'true')
    setShowOnboarding(false)
    setHasSeenOnboarding(true)
  }

  // Don't render if user has already seen onboarding
  if (hasSeenOnboarding) {
    return null
  }

  return (
    <OnboardingTooltip
      steps={getStepsForCurrentPage()}
      isVisible={showOnboarding}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  )
}

export default UserOnboarding