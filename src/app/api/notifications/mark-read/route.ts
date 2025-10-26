import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAll } = body

    if (markAll) {
      // Mark all notifications as read
      const { data, error } = await supabase
        .rpc('mark_all_notifications_read', { p_user_id: user.id })

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        updatedCount: data,
        message: 'All notifications marked as read' 
      })
    } else if (notificationId) {
      // Mark specific notification as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Notification marked as read' 
      })
    }

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })

  } catch (error) {
    console.error('Mark notification read API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}