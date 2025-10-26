'use client'

import MenuContainer from './menu/MenuContainer'

interface DynamicMenuProps {
  className?: string
}

export default function DynamicMenu({ className = '' }: DynamicMenuProps) {
  return <MenuContainer className={className} showHeader={false} />
}