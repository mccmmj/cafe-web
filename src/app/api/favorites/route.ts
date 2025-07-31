import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's favorites
    const { data: favorites, error: favoritesError } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError)
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      favorites: favorites || []
    })

  } catch (error) {
    console.error('Favorites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/favorites - Add item to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { squareItemId, itemName } = await request.json()

    // Validate required fields
    if (!squareItemId || !itemName) {
      return NextResponse.json(
        { error: 'squareItemId and itemName are required' },
        { status: 400 }
      )
    }

    // Add to favorites (will handle duplicates with unique constraint)
    const { data: favorite, error: insertError } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        square_item_id: squareItemId,
        item_name: itemName
      })
      .select()
      .single()

    if (insertError) {
      // Handle unique constraint violation (item already favorited)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Item is already in favorites' },
          { status: 409 }
        )
      }
      
      console.error('Error adding to favorites:', insertError)
      return NextResponse.json(
        { error: 'Failed to add to favorites' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      favorite,
      message: 'Item added to favorites'
    })

  } catch (error) {
    console.error('Add to favorites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/favorites - Remove item from favorites
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { squareItemId } = await request.json()

    // Validate required fields
    if (!squareItemId) {
      return NextResponse.json(
        { error: 'squareItemId is required' },
        { status: 400 }
      )
    }

    // Remove from favorites
    const { error: deleteError } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('square_item_id', squareItemId)

    if (deleteError) {
      console.error('Error removing from favorites:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove from favorites' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from favorites'
    })

  } catch (error) {
    console.error('Remove from favorites error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}