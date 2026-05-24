import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.rpc('get_slot_availability', {
      p_event_date: date,
    })

    if (error) {
      console.error('Slot availability error:', error)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    return NextResponse.json(
      { availability: data || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
