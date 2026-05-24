import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { booking_ref } = await request.json()

    if (!booking_ref) {
      return NextResponse.json({ success: false, error: 'MISSING_REF' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Look up the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_ref', booking_ref.trim().toUpperCase())
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    // Check if already checked in
    if (booking.checked_in) {
      return NextResponse.json({
        success: false,
        error: 'ALREADY_CHECKED_IN',
        booking,
      })
    }

    // Mark as checked in
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq('id', booking.id)
      .select()
      .single()

    if (updateError) {
      console.error('Check-in error:', updateError)
      return NextResponse.json({ success: false, error: 'UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking: updated })
  } catch (err) {
    console.error('Check-in error:', err)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
