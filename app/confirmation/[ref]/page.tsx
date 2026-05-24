'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatTime, formatDate } from '@/lib/constants'

interface Booking {
  booking_ref: string
  slot_time: string
  event_date: string
  nama: string
  email: string
  no_telefon: string
  umur: number
  daerah: string
  negeri: string
  created_at: string
}

export default function ConfirmationPage() {
  const params = useParams()
  const ref = params.ref as string
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<'ms' | 'en'>('ms')

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/booking/${ref}`)
        const data = await res.json()
        if (data.booking) {
          setBooking(data.booking)
        }
      } catch (err) {
        console.error('Failed to fetch booking:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBooking()
  }, [ref])

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const confirmUrl = `${siteUrl}/confirmation/${ref}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(confirmUrl)}`

  if (loading) {
    return (
      <div className="main-container">
        <div className="confirmation-container">
          <div className="glass-card">
            <div className="skeleton" style={{ height: 80, width: 80, borderRadius: '50%', margin: '0 auto 24px' }} />
            <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 200 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="main-container">
        <div className="confirmation-container">
          <div className="glass-card">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h2>{lang === 'ms' ? 'Tempahan tidak dijumpai' : 'Booking not found'}</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                {lang === 'ms' ? 'Rujukan tidak sah atau telah tamat tempoh.' : 'Invalid reference or booking expired.'}
              </p>
              <a href="/" className="btn btn-primary" style={{ marginTop: 24 }}>
                {lang === 'ms' ? 'Kembali ke Laman Utama' : 'Back to Home'}
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-container">
      <nav className="nav">
        <a href="/" className="nav-brand" style={{ textDecoration: 'none' }}>✦ IMAN Booking Slot</a>
        <button className="lang-toggle" onClick={() => setLang(l => l === 'ms' ? 'en' : 'ms')}>
          {lang === 'ms' ? 'EN' : 'BM'}
        </button>
      </nav>

      <div className="confirmation-container fade-in">
        <div className="glass-card glass-card-glow">
          {/* Success Icon */}
          <div className="confirmation-icon">✓</div>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            {lang === 'ms' ? 'Tempahan Berjaya!' : 'Booking Confirmed!'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {lang === 'ms' ? 'Sila simpan rujukan ini' : 'Please save this reference'}
          </p>

          {/* Booking Reference */}
          <div className="confirmation-ref">{booking.booking_ref}</div>

          {/* QR Code */}
          <div style={{ margin: '24px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
              {lang === 'ms' ? '📱 Tunjukkan QR ini semasa kehadiran' : '📱 Show this QR code at entry'}
            </p>
            <div className="qr-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code"
                width={200}
                height={200}
                style={{ display: 'block' }}
              />
            </div>
          </div>

          {/* Booking Details */}
          <div className="confirmation-details">
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Nama' : 'Name'}</span>
              <span className="detail-value">{booking.nama}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Tarikh' : 'Date'}</span>
              <span className="detail-value">{formatDate(booking.event_date, lang)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Masa' : 'Time'}</span>
              <span className="detail-value">{formatTime(booking.slot_time)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Emel' : 'Email'}</span>
              <span className="detail-value">{booking.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'No Telefon' : 'Phone'}</span>
              <span className="detail-value">{booking.no_telefon}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Daerah' : 'Area'}</span>
              <span className="detail-value">{booking.daerah}, {booking.negeri}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={qrUrl} download={`IMAN-QR-${booking.booking_ref}.png`} className="btn btn-secondary">
              📥 {lang === 'ms' ? 'Muat turun QR' : 'Download QR'}
            </a>
            <a href="/" className="btn btn-ghost">
              ← {lang === 'ms' ? 'Kembali' : 'Back Home'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
