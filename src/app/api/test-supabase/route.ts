import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test Supabase connection
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      hasSession: !!data.session,
      sessionInfo: data.session ? {
        userId: data.session.user.id,
        email: data.session.user.email
      } : null
    })
  } catch (error) {
    console.error('Supabase test failed:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Supabase connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}