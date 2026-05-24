'use client'

import { useState, useEffect, useCallback } from 'react'
import { ALL_SLOT_TIMES, formatTime, formatDate, getEventDates, t, type Lang } from '@/lib/constants'

type SlotAvailability = Record<string, number>

interface BookingData {
  nama: string
  email: string
  no_telefon: string
  umur: string
  daerah: string
  negeri: string
}

const INITIAL_FORM: BookingData = {
  nama: '',
  email: '',
  no_telefon: '',
  umur: '',
  daerah: '',
  negeri: '',
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('ms')
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [formData, setFormData] = useState<BookingData>(INITIAL_FORM)
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkRef, setCheckRef] = useState('')
  const [checkLoading, setCheckLoading] = useState(false)

  const tx = t[lang]
  const eventDates = getEventDates()

  // Fetch slot availability when date is selected
  const fetchAvailability = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/slots?date=${date}`)
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
    if (selectedDate) {
      fetchAvailability(selectedDate)
    }
  }, [selectedDate, fetchAvailability])

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot('')
    setStep(2)
  }

  const handleSlotSelect = (slot: string) => {
    const count = slotAvailability[slot] || 0
    if (count >= 30) return
    setSelectedSlot(slot)
    setStep(3)
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
    if (!isFormValid() || !selectedDate || !selectedSlot) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_time: selectedSlot,
          event_date: selectedDate,
          ...formData,
          umur: Number(formData.umur),
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Redirect to confirmation page
        window.location.href = `/confirmation/${data.booking_ref}`
      } else {
        if (data.error === 'SLOT_FULL') {
          setError(tx.errorSlotFull)
          setStep(2)
          fetchAvailability(selectedDate)
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
    if (count >= 30) return 'full'
    if (count >= 20) return 'filling'
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
          <a href="/admin" className="btn btn-ghost">{tx.adminLogin}</a>
        </div>
      </nav>

      {/* Hero */}
      <div className="hero">
        <h1 className="hero-title">{tx.heroTitle}</h1>
        <p className="hero-subtitle">{tx.heroSubtitle}</p>
      </div>

      {/* Steps Indicator */}
      <div className="steps">
        {[tx.step1, tx.step2, tx.step3].map((label, i) => (
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

      {/* Step 1: Date Selection */}
      {step === 1 && (
        <div className="glass-card fade-in">
          <h2 className="section-title">{tx.step1}</h2>
          <p className="section-subtitle">
            {lang === 'ms' ? 'Pilih tarikh untuk tempahan anda' : 'Choose a date for your booking'}
          </p>
          <div className="date-grid">
            {eventDates.map(date => {
              const d = new Date(date + 'T00:00:00')
              return (
                <div
                  key={date}
                  className={`date-card ${selectedDate === date ? 'selected' : ''}`}
                  onClick={() => handleDateSelect(date)}
                >
                  <div className="date-card-day">{d.getDate()}</div>
                  <div className="date-card-label">{formatDate(date, lang)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 2: Slot Selection */}
      {step === 2 && (
        <div className="glass-card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="section-title">{tx.step2}</h2>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← {tx.step1}</button>
          </div>
          <p className="section-subtitle">
            {formatDate(selectedDate, lang)} — {lang === 'ms' ? '30 tempahan setiap slot' : '30 bookings per slot'}
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
                const remaining = 30 - count

                return (
                  <div
                    key={slot}
                    className={`slot-card slot-${status} ${selectedSlot === slot ? 'slot-selected' : ''}`}
                    onClick={() => handleSlotSelect(slot)}
                  >
                    <div className="slot-time">{formatTime(slot)}</div>
                    <div className="slot-count">
                      {count}/30 — {remaining} {tx.slotsLeft}
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

      {/* Step 3: Personal Details Form */}
      {step === 3 && (
        <div className="glass-card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="section-title">{tx.step3}</h2>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← {tx.step2}</button>
          </div>
          <p className="section-subtitle">
            {formatDate(selectedDate, lang)} · {formatTime(selectedSlot)}
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{tx.area}</label>
                <input
                  id="input-daerah"
                  className="form-input"
                  type="text"
                  placeholder={tx.areaPlaceholder}
                  value={formData.daerah}
                  onChange={e => handleInputChange('daerah', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{tx.state}</label>
                <input
                  id="input-negeri"
                  className="form-input"
                  type="text"
                  placeholder={tx.statePlaceholder}
                  value={formData.negeri}
                  onChange={e => handleInputChange('negeri', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Review Summary */}
            <div className="glass-card" style={{ marginTop: 24, marginBottom: 24, padding: 20 }}>
              <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: 12 }}>
                {tx.step4}
              </h3>
              <div className="detail-row">
                <span className="detail-label">{tx.date}</span>
                <span className="detail-value">{formatDate(selectedDate, lang)}</span>
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
