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
  bilangan: number
  created_at: string
}

export default function ConfirmationPage() {
  const params = useParams()
  const ref = params.ref as string
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<'ms' | 'en'>('ms')
  const [downloading, setDownloading] = useState(false)

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

  const qrData = ref
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=2`

  const handleDownloadQR = async () => {
    setDownloading(true)
    try {
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `IMAN-QR-${ref}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(qrUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

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
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
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
          <div className="confirmation-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            {lang === 'ms' ? 'Tempahan Berjaya!' : 'Booking Confirmed!'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {lang === 'ms' ? 'Sila simpan rujukan ini' : 'Please save this reference'}
          </p>

          {/* Booking Reference */}
          <div className="confirmation-ref">{booking.booking_ref}</div>

          {/* QR Code - Prominent */}
          <div style={{ margin: '28px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              {lang === 'ms' ? 'Tunjukkan QR ini semasa kehadiran' : 'Show this QR code at entry'}
            </p>
            <div className="qr-container" style={{ padding: 16, borderRadius: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code"
                width={250}
                height={250}
                style={{ display: 'block' }}
              />
            </div>
            <p style={{ color: 'var(--warning)', fontSize: '0.8rem', marginTop: 12, fontWeight: 500 }}>
              {lang === 'ms' ? 'Sila screenshot atau muat turun QR ini' : 'Please screenshot or download this QR'}
            </p>
          </div>

          {/* Booking Details */}
          <div className="confirmation-details">
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Nama' : 'Name'}</span>
              <span className="detail-value">{booking.nama}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">{lang === 'ms' ? 'Bilangan Orang' : 'Number of People'}</span>
              <span className="detail-value">{booking.bilangan} {lang === 'ms' ? 'orang' : booking.bilangan > 1 ? 'people' : 'person'}</span>
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
            <button className="btn btn-primary" onClick={handleDownloadQR} disabled={downloading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {downloading
                ? (lang === 'ms' ? 'Memuat turun...' : 'Downloading...')
                : (lang === 'ms' ? 'Muat turun QR' : 'Download QR')
              }
            </button>
            <a href="/" className="btn btn-ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              {lang === 'ms' ? 'Kembali' : 'Back Home'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
