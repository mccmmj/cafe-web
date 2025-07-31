import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test database connection by checking if tables exist
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError) {
      return NextResponse.json({
        success: false,
        message: 'Database tables not set up',
        error: profilesError.message,
        setup_required: true
      }, { status: 500 })
    }
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('count')
      .limit(1)
    
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('count')
      .limit(1)
    
    const { data: userFavorites, error: userFavoritesError } = await supabase
      .from('user_favorites')
      .select('count')
      .limit(1)
    
    return NextResponse.json({
      success: true,
      message: 'Database setup verified',
      tables: {
        profiles: profilesError ? 'Error' : 'OK',
        orders: ordersError ? 'Error' : 'OK',
        order_items: orderItemsError ? 'Error' : 'OK',
        user_favorites: userFavoritesError ? 'Error' : 'OK'
      }
    })
  } catch (error) {
    console.error('Database test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}