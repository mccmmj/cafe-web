# Design System Guide

This document outlines the comprehensive design system implemented for the Little Cafe website.

## Design Tokens

### Color Palette

#### Brand Colors (Amber/Orange Theme)
- **Primary 50**: `#fffbeb` - Lightest amber
- **Primary 500**: `#f59e0b` - Main brand color  
- **Primary 600**: `#d97706` - Primary action color
- **Primary 900**: `#78350f` - Darkest amber

#### Semantic Colors
- **Success**: `#22c55e` (Green)
- **Warning**: `#f59e0b` (Amber)
- **Error**: `#ef4444` (Red)
- **Info**: `#3b82f6` (Blue)

#### Surface Colors
- **Primary**: Background color
- **Secondary**: `--gray-50` (Light mode) / `--gray-800` (Dark mode)
- **Tertiary**: `--gray-100` (Light mode) / `--gray-700` (Dark mode)

### Typography Scale

- **XS**: 12px (0.75rem)
- **SM**: 14px (0.875rem)
- **Base**: 16px (1rem)
- **LG**: 18px (1.125rem)
- **XL**: 20px (1.25rem)
- **2XL**: 24px (1.5rem)
- **3XL**: 30px (1.875rem)
- **4XL**: 36px (2.25rem)
- **5XL**: 48px (3rem)
- **6XL**: 60px (3.75rem)

### Spacing Scale

- **1**: 4px (0.25rem)
- **2**: 8px (0.5rem)
- **3**: 12px (0.75rem)
- **4**: 16px (1rem)
- **5**: 20px (1.25rem)
- **6**: 24px (1.5rem)
- **8**: 32px (2rem)
- **10**: 40px (2.5rem)
- **12**: 48px (3rem)
- **16**: 64px (4rem)
- **20**: 80px (5rem)
- **24**: 96px (6rem)

### Border Radius

- **SM**: 2px (0.125rem)
- **MD**: 6px (0.375rem)
- **LG**: 8px (0.5rem)
- **XL**: 12px (0.75rem)
- **2XL**: 16px (1rem)
- **Full**: 9999px

## Components

### Button Component

**Variants:**
- `primary` - Main brand colored button
- `secondary` - Gray button for secondary actions
- `outline` - Outlined button with transparent background
- `ghost` - Text-only button with hover effects
- `danger` - Red button for destructive actions
- `success` - Green button for positive actions
- `warning` - Amber button for caution actions
- `info` - Blue button for informational actions

**Sizes:**
- `xs` - Extra small (24px height)
- `sm` - Small (32px height)
- `md` - Medium (40px height) - Default
- `lg` - Large (48px height)
- `xl` - Extra large (56px height)

**Props:**
- `isLoading` - Shows loading spinner
- `fullWidth` - Takes full container width
- `rounded` - Makes button fully rounded

**Usage:**
```tsx
import Button from '@/components/ui/Button'

<Button variant="primary" size="md">
  Click me
</Button>

<Button variant="outline" size="lg" isLoading>
  Loading...
</Button>
```

### Card Component

**Variants:**
- `default` - Standard card with border and shadow
- `outline` - Card with border only, hover effects
- `filled` - Card with background fill
- `elevated` - Card with larger shadow and lift effect
- `interactive` - Clickable card with hover and focus states

**Padding Options:**
- `none` - No padding
- `sm` - 12px padding
- `md` - 16px padding (Default)
- `lg` - 24px padding

**Sub-components:**
- `CardHeader` - Card header section
- `CardTitle` - Card title heading
- `CardDescription` - Card description text
- `CardContent` - Main card content area
- `CardFooter` - Card footer section

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Input Component

**Variants:**
- `default` - Standard input with border
- `filled` - Input with background fill
- `underlined` - Input with bottom border only

**Sizes:**
- `sm` - Small (32px height)
- `md` - Medium (40px height) - Default
- `lg` - Large (48px height)

**States:**
- `error` - Error state with red styling and icon
- `success` - Success state with green styling and icon

**Props:**
- `label` - Input label text
- `error` - Error message string
- `helper` - Helper text
- `success` - Success state boolean

**Usage:**
```tsx
import Input from '@/components/ui/Input'

<Input 
  label="Email"
  type="email"
  placeholder="Enter your email"
  helper="We'll never share your email"
/>

<Input 
  label="Password"
  type="password"
  error="Password is required"
/>
```

### Badge Component

**Variants:**
- `default` - Primary colored badge
- `secondary` - Gray badge
- `success` - Green badge
- `warning` - Amber badge
- `danger` - Red badge
- `info` - Blue badge
- `outline` - Outlined badge with transparent background

**Sizes:**
- `xs` - Extra small (16px height)
- `sm` - Small (20px height)
- `md` - Medium (24px height) - Default
- `lg` - Large (28px height)

**Props:**
- `dot` - Shows colored dot indicator

**Usage:**
```tsx
import Badge from '@/components/ui/Badge'

<Badge variant="success">Active</Badge>
<Badge variant="warning" dot>Pending</Badge>
<Badge variant="outline" size="sm">Draft</Badge>
```

## Animation System

### Keyframe Animations

- `fadeIn` - Simple opacity fade in
- `fadeInScale` - Fade in with scale effect
- `slideInFromRight` - Slide in from right with fade
- `slideInFromLeft` - Slide in from left with fade
- `slideInFromTop` - Slide in from top with fade
- `slideInFromBottom` - Slide in from bottom with fade
- `pulse` - Pulsing opacity effect
- `bounce` - Bouncing animation
- `spin` - Continuous rotation
- `ping` - Ping/radar effect

### Utility Classes

- `.animate-fade-in` - Apply fade in animation
- `.animate-fade-in-scale` - Apply fade in with scale
- `.animate-slide-in-right` - Apply slide in from right
- `.animate-slide-in-left` - Apply slide in from left
- `.animate-slide-in-top` - Apply slide in from top
- `.animate-slide-in-bottom` - Apply slide in from bottom
- `.animate-pulse` - Apply pulse animation
- `.animate-bounce` - Apply bounce animation
- `.animate-spin` - Apply spin animation
- `.animate-ping` - Apply ping animation

### Hover Effects

- `.hover-lift` - Lift effect on hover with shadow
- `.hover-scale` - Scale up on hover
- `.focus-ring` - Focus ring effect

### Transition Classes

- `.transition-base` - Standard transition (300ms)
- `.transition-fast` - Fast transition (150ms)
- `.transition-slow` - Slow transition (500ms)
- `.transition-colors` - Color-only transitions
- `.transition-transform` - Transform-only transitions
- `.transition-opacity` - Opacity-only transitions

## Dark Mode Support

The design system includes comprehensive dark mode support through CSS custom properties that automatically adapt based on user's system preference.

### Dark Mode Colors

- Background adapts from white to dark gray
- Text colors automatically invert
- Borders and surfaces adjust appropriately
- All components maintain contrast ratios

## Accessibility Features

### Focus Management
- Enhanced focus rings for all interactive elements
- Proper focus visibility for keyboard navigation
- Focus trap support in modals and overlays

### Reduced Motion
- Respects `prefers-reduced-motion` setting
- Disables animations for users who prefer reduced motion

### Color Contrast
- All color combinations meet WCAG AA standards
- High contrast mode compatibility

### Screen Reader Support
- Semantic HTML structure
- Proper ARIA attributes
- Descriptive text for interactive elements

## CSS Custom Properties

All design tokens are available as CSS custom properties:

```css
/* Colors */
--primary-500: #f59e0b;
--success-500: #22c55e;
--error-500: #ef4444;

/* Spacing */
--space-4: 1rem;
--space-6: 1.5rem;

/* Typography */
--font-size-base: 1rem;
--font-weight-medium: 500;

/* Transitions */
--transition-fast: 150ms ease-in-out;
--transition-normal: 300ms ease-in-out;

/* Shadows */
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

## Usage Guidelines

### Consistency
- Always use design tokens instead of hardcoded values
- Maintain consistent spacing using the spacing scale
- Use semantic color names for better maintainability

### Performance
- Use transitions sparingly to maintain smooth performance
- Prefer CSS animations over JavaScript animations
- Optimize for mobile and touch interactions

### Extensibility
- New components should follow existing patterns
- Use the variant system for component customization
- Maintain backward compatibility when adding new features

## Brand Guidelines

### Logo Usage
- Maintain adequate spacing around the logo
- Use appropriate contrast for background colors
- Scale proportionally, never distort

### Color Usage
- Primary amber/orange for main actions and branding
- Use semantic colors appropriately (green for success, red for errors)
- Maintain sufficient contrast ratios

### Typography
- Use Inter font family for consistency
- Maintain proper hierarchy with font sizes
- Ensure readable line spacing