'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui'
import { Plus, Edit, Trash2, Tag, Coffee, AlertTriangle } from 'lucide-react'
import { isStarbucksCategory } from '@/lib/constants/menu'
import CategoryCreateModal from './CategoryCreateModal'
import CategoryEditModal from './CategoryEditModal'
import CategoryDeleteModal from './CategoryDeleteModal'

interface Category {
  id: string
  name: string
  ordinal: number
  parentCategory?: string
  itemCount: number
}

interface CategoryCreatePayload {
  name: string
  ordinal: number
  parentCategory?: string
}

interface CategoryUpdatePayload {
  categoryId: string
  updateData: {
    name?: string
    ordinal?: number
    parentCategory?: string | null
  }
}

const CategoryManagement = () => {
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  const queryClient = useQueryClient()

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: CategoryCreatePayload) => {
      const response = await fetch('/api/admin/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to create category')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
    }
  })

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ categoryId, updateData }: CategoryUpdatePayload) => {
      const response = await fetch('/api/admin/menu/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, ...updateData })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update category')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
    }
  })

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await fetch('/api/admin/menu/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to delete category')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      queryClient.invalidateQueries({ queryKey: ['admin-menu-items'] })
    }
  })

  // Fetch categories
  const { 
    data: categoriesData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/menu/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      return response.json()
    }
  })

  const categories: Category[] = categoriesData?.categories || []

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
          <p>Failed to load categories</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Category Management</h3>
          <p className="text-gray-600 mt-1">
            Organize your menu items into categories
          </p>
        </div>
        <Button
          onClick={() => setCreatingCategory(true)}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Category
        </Button>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Current Categories</h4>
          <p className="text-sm text-gray-600 mt-1">{categories.length} categories total</p>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No categories found</h3>
            <p className="mb-4">Create your first category to organize menu items</p>
            <Button
              onClick={() => setCreatingCategory(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Category
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map((category) => {
              const isWpsProtected = isStarbucksCategory(category.name)
              
              return (
                <div key={category.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Coffee className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          {isWpsProtected && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              WPS Protected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {category.itemCount} item{category.itemCount !== 1 ? 's' : ''}
                          {category.parentCategory && ` • Child of ${category.parentCategory}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                        disabled={isWpsProtected}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingCategory(category)}
                        disabled={isWpsProtected || category.itemCount > 0}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* WPS Protection Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">WPS Compliance Protection</h4>
            <p className="text-sm text-amber-700 mt-1">
              Starbucks-branded categories are protected and cannot be modified or deleted to maintain 
              We Proudly Serve compliance. Only custom categories can be edited.
            </p>
          </div>
        </div>
      </div>

      {/* Category Create Modal */}
      <CategoryCreateModal
        isOpen={creatingCategory}
        onClose={() => setCreatingCategory(false)}
        onCreateCategory={createCategoryMutation.mutateAsync}
        existingCategories={categories}
      />

      {/* Category Edit Modal */}
      <CategoryEditModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onUpdateCategory={async (categoryId: string, updateData: CategoryUpdatePayload['updateData']) => {
          await updateCategoryMutation.mutateAsync({ categoryId, updateData })
        }}
        category={editingCategory}
        existingCategories={categories}
      />

      {/* Category Delete Modal */}
      <CategoryDeleteModal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onDeleteCategory={deleteCategoryMutation.mutateAsync}
        category={deletingCategory}
      />
    </div>
  )
}

export default CategoryManagement
