'use client'

import { useState, useEffect, useRef } from 'react'
import { formatTime, formatDate } from '@/lib/constants'

interface Booking {
  id: string
  booking_ref: string
  slot_time: string
  event_date: string
  nama: string
  email: string
  no_telefon: string
  umur: number
  daerah: string
  negeri: string
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
}

type ScanResult = 
  | { status: 'success'; booking: Booking }
  | { status: 'already'; booking: Booking }
  | { status: 'error'; message: string }

export default function ScannerView() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [manualRef, setManualRef] = useState('')
  const [processing, setProcessing] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrRef = useRef<unknown>(null)

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        const scanner = html5QrRef.current as { stop: () => Promise<void>; clear: () => void }
        await scanner.stop()
        scanner.clear()
      } catch { /* ignore */ }
      html5QrRef.current = null
    }
    setScanning(false)
  }

  const processRef = async (ref: string) => {
    const bookingRef = ref.trim().toUpperCase()
    if (!bookingRef) return

    setProcessing(true)
    setResult(null)

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: bookingRef }),
      })
      const data = await res.json()

      if (data.success) {
        setResult({ status: 'success', booking: data.booking })
      } else if (data.error === 'ALREADY_CHECKED_IN') {
        setResult({ status: 'already', booking: data.booking })
      } else if (data.error === 'NOT_FOUND') {
        setResult({ status: 'error', message: 'Booking not found' })
      } else {
        setResult({ status: 'error', message: 'Check-in failed' })
      }
    } catch {
      setResult({ status: 'error', message: 'Network error' })
    } finally {
      setProcessing(false)
    }
  }

  const startScanner = async () => {
    setResult(null)
    setScanning(true)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      
      // Small delay for DOM
      await new Promise(r => setTimeout(r, 200))

      if (!scannerRef.current) return

      const scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner()
          // Extract booking ref - could be just the ref or a URL containing it
          let ref = decodedText
          if (ref.includes('/confirmation/')) {
            ref = ref.split('/confirmation/').pop() || ref
          }
          if (ref.startsWith('IMAN-')) {
            processRef(ref)
          } else {
            // Try as-is
            processRef(ref)
          }
        },
        () => { /* ignore scan errors */ }
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setScanning(false)
      setResult({ status: 'error', message: 'Camera access denied or not available' })
    }
  }

  useEffect(() => {
    return () => { stopScanner() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="scanner-container fade-in">
      {/* Scanner Controls */}
      {!scanning && !result && (
        <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ marginBottom: 24 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              <rect x="7" y="7" width="10" height="10" rx="1"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: 8 }}>
            QR Scanner
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
            Scan a booking QR code to check in
          </p>
          <button className="btn btn-primary btn-lg" onClick={startScanner}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            </svg>
            Start Scanner
          </button>

          {/* Manual entry */}
          <div style={{ marginTop: 32, borderTop: '1px solid var(--glass-border)', paddingTop: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>Or enter booking reference manually</p>
            <div style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
              <input
                className="form-input"
                type="text"
                placeholder="IMAN-XXXXXX"
                value={manualRef}
                onChange={e => setManualRef(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') processRef(manualRef) }}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: 1 }}
              />
              <button className="btn btn-secondary" onClick={() => processRef(manualRef)} disabled={processing || !manualRef.trim()}>
                {processing ? <span className="spinner" /> : 'Check In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera View */}
      {scanning && (
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)' }}>Scanning...</h3>
            <button className="btn btn-ghost" onClick={stopScanner}>Cancel</button>
          </div>
          <div id="qr-reader" ref={scannerRef} style={{ width: '100%', maxWidth: 400, margin: '0 auto', borderRadius: 12, overflow: 'hidden' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 12 }}>Point camera at the QR code</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="glass-card fade-in" style={{ textAlign: 'center' }}>
          {result.status === 'success' && (
            <>
              <div className="checkin-status checkin-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h2 style={{ color: 'var(--success)', marginTop: 12, fontFamily: 'var(--font-heading)' }}>Checked In</h2>
              </div>
              <BookingDetails booking={result.booking} />
            </>
          )}

          {result.status === 'already' && (
            <>
              <div className="checkin-status checkin-warning">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h2 style={{ color: 'var(--warning)', marginTop: 12, fontFamily: 'var(--font-heading)' }}>Already Checked In</h2>
                {result.booking.checked_in_at && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    at {new Date(result.booking.checked_in_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <BookingDetails booking={result.booking} />
            </>
          )}

          {result.status === 'error' && (
            <div className="checkin-status checkin-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <h2 style={{ color: 'var(--danger)', marginTop: 12, fontFamily: 'var(--font-heading)' }}>{result.message}</h2>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => { setResult(null); setManualRef('') }} style={{ marginTop: 24 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            </svg>
            Scan Next
          </button>
        </div>
      )}
    </div>
  )
}

function BookingDetails({ booking }: { booking: Booking }) {
  return (
    <div className="confirmation-details" style={{ maxWidth: 400, margin: '20px auto 0' }}>
      <div className="detail-row">
        <span className="detail-label">Reference</span>
        <span className="detail-value" style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{booking.booking_ref}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Name</span>
        <span className="detail-value">{booking.nama}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Date</span>
        <span className="detail-value">{formatDate(booking.event_date, 'en')}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Time</span>
        <span className="detail-value">{formatTime(booking.slot_time)}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Phone</span>
        <span className="detail-value">{booking.no_telefon}</span>
      </div>
      <div className="detail-row">
        <span className="detail-label">Area</span>
        <span className="detail-value">{booking.daerah}, {booking.negeri}</span>
      </div>
    </div>
  )
}
