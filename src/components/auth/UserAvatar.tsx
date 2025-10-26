'use client'

import { User } from 'lucide-react'

interface UserAvatarProps {
  user: { id: string; email?: string; user_metadata?: { full_name?: string } }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const UserAvatar = ({ user, size = 'md', className = '' }: UserAvatarProps) => {
  const fullName = user.user_metadata?.full_name || user.email
  const initials = fullName 
    ? fullName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  }

  return (
    <div className={`${sizes[size]} ${className} rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-medium`}>
      {initials.length > 0 ? initials : <User className="h-4 w-4" />}
    </div>
  )
}

export default UserAvatar