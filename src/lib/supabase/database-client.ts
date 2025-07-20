import { createClient } from './client'
import type { UserProfile } from '@/types/menu'

// Client-side database operations (for components)
export function createClientDatabaseHelpers() {
  const supabase = createClient()
  
  return {
    async getUserFavorites(userId: string) {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    
    async addToFavorites(userId: string, squareItemId: string, itemName: string) {
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: userId,
          square_item_id: squareItemId,
          item_name: itemName
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    
    async removeFromFavorites(userId: string, squareItemId: string) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('square_item_id', squareItemId)
      
      if (error) throw error
    },
    
    async getMyProfile() {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single()
      
      if (error) throw error
      return data
    },
    
    async updateMyProfile(updates: Partial<UserProfile>) {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.user.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },

    async getMyOrders() {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  }
}