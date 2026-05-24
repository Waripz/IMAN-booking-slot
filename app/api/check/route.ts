import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  try {
    // Try by booking_ref first
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('booking_ref', q.toUpperCase())
      .single()

    let { data, error } = await query

    // If not found by ref, try by email
    if (error || !data) {
      const emailQuery = await supabase
        .from('bookings')
        .select('*')
        .eq('email', q.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      data = emailQuery.data
      error = emailQuery.error
    }

    if (error || !data) {
      return NextResponse.json({ booking: null })
    }

    return NextResponse.json({ booking: data })
  } catch (err) {
    console.error('Check error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
