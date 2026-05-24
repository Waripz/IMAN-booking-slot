import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { booking_ref } = await request.json()

    if (!booking_ref) {
      return NextResponse.json({ success: false, error: 'MISSING_REF' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('booking_ref', booking_ref.trim().toUpperCase())

    if (error) {
      console.error('Cancel error:', error)
      return NextResponse.json({ success: false, error: 'DELETE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Cancel error:', err)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
