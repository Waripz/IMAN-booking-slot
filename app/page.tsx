'use client'

import { useState, useEffect, useCallback } from 'react'
import { ALL_SLOT_TIMES, EVENT_CONFIG, formatTime, formatDate, t, type Lang } from '@/lib/constants'
import { MALAYSIA_STATES, NEGERI_LIST } from '@/lib/malaysia'

type SlotAvailability = Record<string, number>

interface BookingData {
  nama: string
  email: string
  no_telefon: string
  umur: string
  daerah: string
  negeri: string
  bilangan: string
}

const INITIAL_FORM: BookingData = {
  nama: '',
  email: '',
  no_telefon: '',
  umur: '',
  daerah: '',
  negeri: '',
  bilangan: '1',
}

const EVENT_DATE = EVENT_CONFIG.eventDate // '2026-06-06'

export default function Home() {
  const [lang, setLang] = useState<Lang>('ms')
  const [step, setStep] = useState(1)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [formData, setFormData] = useState<BookingData>(INITIAL_FORM)
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkRef, setCheckRef] = useState('')
  const [checkLoading, setCheckLoading] = useState(false)

  const tx = t[lang]

  // Fetch slot availability on mount (single date)
  const fetchAvailability = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/slots?date=${EVENT_DATE}`)
      const data = await res.json()
      if (data.availability) {
        const map: SlotAvailability = {}
        data.availability.forEach((s: { slot_time: string; booked_count: number }) => {
          map[s.slot_time] = s.booked_count
        })
        setSlotAvailability(map)
      }
    } catch {
      console.error('Failed to fetch availability')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const handleSlotSelect = (slot: string) => {
    const count = slotAvailability[slot] || 0
    if (count >= EVENT_CONFIG.maxPerSlot) return
    setSelectedSlot(slot)
    setStep(2)
  }

  const handleInputChange = (field: keyof BookingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const isFormValid = () => {
    return (
      formData.nama.trim() &&
      formData.email.trim() &&
      formData.email.includes('@') &&
      formData.no_telefon.trim() &&
      formData.umur.trim() &&
      Number(formData.umur) > 0 &&
      formData.daerah.trim() &&
      formData.negeri.trim()
    )
  }

  const handleSubmit = async () => {
    if (!isFormValid() || !selectedSlot) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_time: selectedSlot,
          event_date: EVENT_DATE,
          ...formData,
          umur: Number(formData.umur),
          bilangan: Number(formData.bilangan) || 1,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Redirect to confirmation page
        window.location.href = `/confirmation/${data.booking_ref}`
      } else {
        if (data.error === 'SLOT_FULL') {
          setError(tx.errorSlotFull)
          setStep(1)
          fetchAvailability()
        } else if (data.error === 'ALREADY_BOOKED') {
          setError(tx.errorAlreadyBooked)
        } else {
          setError(tx.errorGeneral)
        }
      }
    } catch {
      setError(tx.errorGeneral)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCheck = async () => {
    if (!checkRef.trim()) return
    setCheckLoading(true)
    try {
      const res = await fetch(`/api/check?q=${encodeURIComponent(checkRef.trim())}`)
      const data = await res.json()
      if (data.booking) {
        window.location.href = `/confirmation/${data.booking.booking_ref}`
      } else {
        setError(tx.noBookings)
        setTimeout(() => setError(''), 3000)
      }
    } catch {
      setError(tx.errorGeneral)
    } finally {
      setCheckLoading(false)
    }
  }

  const getSlotStatus = (slot: string) => {
    const count = slotAvailability[slot] || 0
    if (count >= EVENT_CONFIG.maxPerSlot) return 'full'
    if (count >= EVENT_CONFIG.maxPerSlot * 0.67) return 'filling'
    return 'available'
  }

  return (
    <div className="main-container">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-brand">✦ IMAN Booking Slot</div>
        <div className="nav-actions">
          <button className="lang-toggle" onClick={() => setLang(l => l === 'ms' ? 'en' : 'ms')}>
            {tx.langSwitch}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <h1 className="hero-title">{tx.heroTitle}</h1>
        <p className="hero-subtitle">{tx.heroSubtitle}</p>
      </div>

      {/* Steps Indicator */}
      <div className="steps">
        {[tx.step1, tx.step2].map((label, i) => (
          <div
            key={i}
            className={`step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'completed' : ''}`}
            onClick={() => { if (i + 1 < step) setStep(i + 1) }}
            style={{ cursor: i + 1 < step ? 'pointer' : 'default' }}
          >
            <span className="step-number">{step > i + 1 ? '✓' : i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="toast toast-error">{error}</div>
      )}

      {/* Step 1: Slot Selection */}
      {step === 1 && (
        <div className="glass-card fade-in">
          <h2 className="section-title">{tx.step1}</h2>
          <p className="section-subtitle">
            {formatDate(EVENT_DATE, lang)} — {lang === 'ms' ? '30 tempahan setiap slot' : '30 bookings per slot'}
          </p>

          {loading ? (
            <div className="slot-grid">
              {ALL_SLOT_TIMES.map(s => (
                <div key={s} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <div className="slot-grid">
              {ALL_SLOT_TIMES.map(slot => {
                const status = getSlotStatus(slot)
                const count = slotAvailability[slot] || 0
                const remaining = EVENT_CONFIG.maxPerSlot - count

                return (
                  <div
                    key={slot}
                    className={`slot-card slot-${status} ${selectedSlot === slot ? 'slot-selected' : ''}`}
                    onClick={() => handleSlotSelect(slot)}
                  >
                    <div className="slot-time">{formatTime(slot)}</div>
                    <div className="slot-count">
                      {count}/{EVENT_CONFIG.maxPerSlot} — {remaining} {tx.slotsLeft}
                    </div>
                    <span className={`slot-badge badge-${status}`}>
                      {status === 'available' ? tx.available : status === 'filling' ? tx.filling : tx.full}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Personal Details Form */}
      {step === 2 && (
        <div className="glass-card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="section-title">{tx.step2}</h2>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← {tx.step1}</button>
          </div>
          <p className="section-subtitle">
            {formatDate(EVENT_DATE, lang)} · {formatTime(selectedSlot)}
          </p>

          <div className="form-section">
            <div className="form-group">
              <label className="form-label">{tx.name}</label>
              <input
                id="input-nama"
                className="form-input"
                type="text"
                placeholder={tx.namePlaceholder}
                value={formData.nama}
                onChange={e => handleInputChange('nama', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{tx.email}</label>
              <input
                id="input-email"
                className="form-input"
                type="email"
                placeholder={tx.emailPlaceholder}
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{tx.phone}</label>
                <input
                  id="input-phone"
                  className="form-input"
                  type="tel"
                  placeholder={tx.phonePlaceholder}
                  value={formData.no_telefon}
                  onChange={e => handleInputChange('no_telefon', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{tx.age}</label>
                <input
                  id="input-age"
                  className="form-input"
                  type="number"
                  min="1"
                  max="120"
                  placeholder={tx.agePlaceholder}
                  value={formData.umur}
                  onChange={e => handleInputChange('umur', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Bilangan Orang */}
            <div className="form-group">
              <label className="form-label">{tx.bilangan}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3].map(n => {
                  const count = slotAvailability[selectedSlot] || 0
                  const remaining = EVENT_CONFIG.maxPerSlot - count
                  const disabled = n > remaining
                  return (
                    <button
                      key={n}
                      type="button"
                      className={`btn ${formData.bilangan === String(n) ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '12px 0', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                      onClick={() => !disabled && handleInputChange('bilangan', String(n))}
                      disabled={disabled}
                    >
                      {n} {lang === 'ms' ? 'orang' : n > 1 ? 'people' : 'person'}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                {lang === 'ms' ? `Maksimum ${EVENT_CONFIG.maxBilangan} orang setiap tempahan` : `Maximum ${EVENT_CONFIG.maxBilangan} people per booking`}
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{tx.state}</label>
                <select
                  id="input-negeri"
                  className="form-input"
                  value={formData.negeri}
                  onChange={e => {
                    handleInputChange('negeri', e.target.value)
                    handleInputChange('daerah', '') // reset daerah on negeri change
                  }}
                  required
                >
                  <option value="" disabled>{lang === 'ms' ? 'Pilih Negeri' : 'Select State'}</option>
                  {NEGERI_LIST.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{tx.area}</label>
                <select
                  id="input-daerah"
                  className="form-input"
                  value={formData.daerah}
                  onChange={e => handleInputChange('daerah', e.target.value)}
                  required
                  disabled={!formData.negeri}
                >
                  <option value="" disabled>{lang === 'ms' ? 'Pilih Daerah' : 'Select District'}</option>
                  {formData.negeri && MALAYSIA_STATES[formData.negeri]?.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Review Summary */}
            <div className="glass-card" style={{ marginTop: 24, marginBottom: 24, padding: 20 }}>
              <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 12 }}>
                {tx.step3}
              </h3>
              <div className="detail-row">
                <span className="detail-label">{tx.date}</span>
                <span className="detail-value">{formatDate(EVENT_DATE, lang)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{tx.time}</span>
                <span className="detail-value">{formatTime(selectedSlot)}</span>
              </div>
              {formData.nama && (
                <div className="detail-row">
                  <span className="detail-label">{tx.name}</span>
                  <span className="detail-value">{formData.nama}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">{tx.bilangan}</span>
                <span className="detail-value">{formData.bilangan} {lang === 'ms' ? 'orang' : Number(formData.bilangan) > 1 ? 'people' : 'person'}</span>
              </div>
            </div>

            <button
              id="btn-book"
              className="btn btn-primary btn-lg btn-block"
              disabled={!isFormValid() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <><span className="spinner" /> {tx.booking}</>
              ) : (
                tx.bookNow
              )}
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="divider" />

      {/* Check Booking Section */}
      <div className="check-section fade-in">
        <h2 className="section-title">{tx.checkBooking}</h2>
        <div className="check-input-group">
          <input
            id="input-check"
            className="form-input"
            type="text"
            placeholder={tx.checkPlaceholder}
            value={checkRef}
            onChange={e => setCheckRef(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCheck() }}
          />
          <button
            className="btn btn-secondary"
            onClick={handleCheck}
            disabled={checkLoading}
          >
            {checkLoading ? <span className="spinner" /> : tx.search}
          </button>
        </div>
      </div>

      <div style={{ height: 60 }} />
    </div>
  )
}
