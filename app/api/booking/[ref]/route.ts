import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_ref', ref.toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ booking: null }, { status: 404 })
  }

  return NextResponse.json({ booking: data })
}
