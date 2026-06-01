import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { slot_time, event_date, nama, email, no_telefon, umur, daerah, negeri, bilangan } = body

    // Basic validation
    if (!slot_time || !event_date || !nama || !email || !no_telefon || !umur || !daerah || !negeri) {
      return NextResponse.json({ success: false, error: 'MISSING_FIELDS' }, { status: 400 })
    }

    // Email format validation
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ success: false, error: 'INVALID_EMAIL' }, { status: 400 })
    }

    // Bilangan validation (1-3)
    const bil = Number(bilangan) || 1
    if (bil < 1 || bil > 3) {
      return NextResponse.json({ success: false, error: 'INVALID_BILANGAN' }, { status: 400 })
    }

    // Call the atomic booking RPC
    const { data, error } = await supabase.rpc('create_booking', {
      p_slot_time: slot_time,
      p_event_date: event_date,
      p_nama: nama.trim(),
      p_email: email.trim().toLowerCase(),
      p_no_telefon: no_telefon.trim(),
      p_umur: Number(umur),
      p_daerah: daerah.trim(),
      p_negeri: negeri.trim(),
      p_bilangan: bil,
    })

    if (error) {
      console.error('Booking RPC error:', error)
      return NextResponse.json({ success: false, error: 'DB_ERROR' }, { status: 500 })
    }

    // The RPC returns a JSON object with success/error
    const result = data as { success: boolean; error?: string; booking_ref?: string; id?: string }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 })
    }

    // Optionally send email confirmation
    if (process.env.RESEND_API_KEY && result.booking_ref) {
      try {
        await sendConfirmationEmail({
          to: email.trim().toLowerCase(),
          bookingRef: result.booking_ref,
          nama: nama.trim(),
          date: event_date,
          time: slot_time,
          bilangan: bil,
        })
      } catch (emailErr) {
        // Don't fail the booking if email fails
        console.error('Email send error:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      booking_ref: result.booking_ref,
    })
  } catch (err) {
    console.error('Booking error:', err)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

async function sendConfirmationEmail(params: {
  to: string
  bookingRef: string
  nama: string
  date: string
  time: string
  bilangan: number
}) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const confirmUrl = `${siteUrl}/confirmation/${params.bookingRef}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(confirmUrl)}`

  const [h, m] = params.time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h
  const timeDisplay = `${h12}:${m.toString().padStart(2, '0')} ${period}`

  await resend.emails.send({
    from: 'IMAN Booking <onboarding@resend.dev>',
    to: params.to,
    subject: `Pengesahan Tempahan - ${params.bookingRef}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a1a; color: #f1f5f9; padding: 40px 30px; border-radius: 16px;">
        <h1 style="text-align: center; color: #942835; font-size: 24px; margin-bottom: 8px;">Galeri Sedekad Teme Abdullah</h1>
        <p style="text-align: center; color: #94a3b8; margin-bottom: 30px;">Pengesahan Tempahan / Booking Confirmation</p>
        
        <div style="background: rgba(245,158,11,0.1); border: 2px dashed rgba(245,158,11,0.4); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">RUJUKAN / REFERENCE</p>
          <p style="color: #f59e0b; font-size: 28px; font-weight: 800; letter-spacing: 2px;">${params.bookingRef}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Nama / Name</td><td style="padding: 10px 0; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${params.nama}</td></tr>
          <tr><td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Tarikh / Date</td><td style="padding: 10px 0; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${params.date}</td></tr>
          <tr><td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06);">Masa / Time</td><td style="padding: 10px 0; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">${timeDisplay}</td></tr>
          <tr><td style="padding: 10px 0; color: #94a3b8;">Bilangan / People</td><td style="padding: 10px 0; text-align: right;">${params.bilangan}</td></tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">QR Kehadiran / Entry QR</p>
          <img src="${qrUrl}" alt="QR Code" style="width: 180px; height: 180px; border-radius: 8px;" />
        </div>
        
        <div style="text-align: center;">
          <a href="${confirmUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; text-decoration: none; border-radius: 8px; font-weight: 600;">Lihat Tempahan / View Booking</a>
        </div>
        
        <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 30px;">Sila simpan emel ini sebagai bukti tempahan.<br/>Please keep this email as proof of booking.</p>
      </div>
    `,
  })
}
