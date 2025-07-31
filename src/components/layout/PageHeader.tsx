'use client'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

const PageHeader = ({ title, description, children, className = '' }: PageHeaderProps) => {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      {description && (
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

export default PageHeader