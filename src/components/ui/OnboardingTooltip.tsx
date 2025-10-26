'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import Button from './Button'

interface OnboardingStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingTooltipProps {
  steps: OnboardingStep[]
  isVisible: boolean
  onComplete: () => void
  onSkip: () => void
}

const OnboardingTooltip = ({ 
  steps, 
  isVisible, 
  onComplete, 
  onSkip 
}: OnboardingTooltipProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!isVisible || currentStep >= steps.length) {
      setShowTooltip(false)
      return
    }

    const step = steps[currentStep]
    const targetElement = document.querySelector(step.targetSelector)
    
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      
      // Calculate tooltip position based on step position preference
      let x = rect.left + rect.width / 2
      let y = rect.top + scrollTop
      
      switch (step.position) {
        case 'bottom':
          y = rect.bottom + scrollTop + 10
          break
        case 'top':
          y = rect.top + scrollTop - 10
          break
        case 'left':
          x = rect.left - 10
          y = rect.top + scrollTop + rect.height / 2
          break
        case 'right':
          x = rect.right + 10
          y = rect.top + scrollTop + rect.height / 2
          break
        default:
          y = rect.bottom + scrollTop + 10
      }
      
      setTooltipPosition({ x, y })
      setShowTooltip(true)

      // Scroll target into view
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }, [currentStep, steps, isVisible])

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isVisible || !showTooltip || currentStep >= steps.length) {
    return null
  }

  const step = steps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" />
      
      {/* Tooltip */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm"
        style={{
          left: tooltipPosition.x - 150, // Center the tooltip
          top: tooltipPosition.y,
          transform: 'translateX(0)'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">
              {step.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="p-1 h-6 w-6 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-600 mb-4">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs"
          >
            Skip Tour
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="text-xs px-3"
              >
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={nextStep}
              className="text-xs px-3 flex items-center gap-1"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default OnboardingTooltip