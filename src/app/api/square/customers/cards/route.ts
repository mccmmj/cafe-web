import { NextResponse } from 'next/server'
import { getCustomerCards, searchSquareCustomerByEmail } from '@/lib/square/customers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's Square customer ID from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('square_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.square_customer_id

    // If no customer ID in database, try to find by email
    if (!customerId && user.email) {
      customerId = await searchSquareCustomerByEmail(user.email)
      
      // If found, store it in our database
      if (customerId) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            square_customer_id: customerId
          }, {
            onConflict: 'id'
          })
      }
    }

    // If still no customer, return empty array
    if (!customerId) {
      return NextResponse.json({
        success: true,
        cards: []
      })
    }

    // Get customer's saved cards
    const cards = await getCustomerCards(customerId)

    return NextResponse.json({
      success: true,
      cards
    })

  } catch (error) {
    console.error('Get cards error:', error)
    
    return NextResponse.json(
      { error: 'Failed to retrieve saved payment methods' },
      { status: 500 }
    )
  }
}
