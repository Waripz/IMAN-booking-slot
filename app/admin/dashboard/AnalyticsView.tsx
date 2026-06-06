'use client'

import { useMemo, useState } from 'react'
import { formatTime, ALL_SLOT_TIMES, EVENT_CONFIG } from '@/lib/constants'

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
  bilangan: number
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
}

interface AnalyticsViewProps {
  bookings: Booking[]
  onFilterChange?: (filter: { field: string; value: string }) => void
}

// Color palette matching the design system
const CHART_COLORS = [
  '#942835', '#cc974e', '#10b981', '#6366f1', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#e11d48', '#7c3aed', '#0ea5e9',
]

export default function AnalyticsView({ bookings, onFilterChange }: AnalyticsViewProps) {
  const [activeChart, setActiveChart] = useState<string | null>(null)

  const stats = useMemo(() => {
    const totalBookings = bookings.length
    const totalPeople = bookings.reduce((s, b) => s + (b.bilangan || 1), 0)
    const avgAge = totalBookings > 0
      ? Math.round(bookings.reduce((s, b) => s + b.umur, 0) / totalBookings)
      : 0
    const checkedIn = bookings.filter(b => b.checked_in).reduce((sum, b) => sum + (b.bilangan || 1), 0)

    // Top negeri
    const negeriCounts: Record<string, number> = {}
    bookings.forEach(b => { negeriCounts[b.negeri] = (negeriCounts[b.negeri] || 0) + (b.bilangan || 1) })
    const topNegeri = Object.entries(negeriCounts).sort((a, b) => b[1] - a[1])[0]

    // Most popular slot
    const slotCounts: Record<string, number> = {}
    bookings.forEach(b => { slotCounts[b.slot_time] = (slotCounts[b.slot_time] || 0) + (b.bilangan || 1) })
    const topSlot = Object.entries(slotCounts).sort((a, b) => b[1] - a[1])[0]

    return { totalBookings, totalPeople, avgAge, checkedIn, topNegeri, topSlot }
  }, [bookings])

  // ─── Chart Data ────────────────────────────────────────────────────────────

  const negeriData = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.forEach(b => { counts[b.negeri] = (counts[b.negeri] || 0) + (b.bilangan || 1) })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const max = sorted[0]?.[1] || 1
    return sorted.map(([name, count], i) => ({
      name, count, pct: Math.round((count / stats.totalPeople) * 100),
      width: (count / max) * 100, color: CHART_COLORS[i % CHART_COLORS.length]
    }))
  }, [bookings, stats.totalPeople])

  const ageData = useMemo(() => {
    const buckets = [
      { label: '< 18', min: 0, max: 17 },
      { label: '18-25', min: 18, max: 25 },
      { label: '26-35', min: 26, max: 35 },
      { label: '36-45', min: 36, max: 45 },
      { label: '46-55', min: 46, max: 55 },
      { label: '55+', min: 56, max: 999 },
    ]
    const data = buckets.map(bucket => {
      const count = bookings.filter(b => b.umur >= bucket.min && b.umur <= bucket.max)
        .reduce((s, b) => s + (b.bilangan || 1), 0)
      return { ...bucket, count }
    })
    const max = Math.max(...data.map(d => d.count), 1)
    return data.map((d, i) => ({ ...d, height: (d.count / max) * 100, color: CHART_COLORS[i] }))
  }, [bookings])

  const slotData = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.forEach(b => { counts[b.slot_time] = (counts[b.slot_time] || 0) + (b.bilangan || 1) })
    return ALL_SLOT_TIMES.map((slot, i) => ({
      slot, label: formatTime(slot),
      count: counts[slot] || 0,
      height: ((counts[slot] || 0) / EVENT_CONFIG.maxPerSlot) * 100,
      color: (counts[slot] || 0) >= EVENT_CONFIG.maxPerSlot ? '#ef4444'
        : (counts[slot] || 0) >= EVENT_CONFIG.maxPerSlot * 0.67 ? '#cc974e' : '#10b981',
    }))
  }, [bookings])

  const bilanganData = useMemo(() => {
    const counts = [0, 0, 0] // index 0=1person, 1=2people, 2=3people
    bookings.forEach(b => {
      const bil = (b.bilangan || 1) - 1
      if (bil >= 0 && bil < 3) counts[bil]++
    })
    const total = counts.reduce((a, b) => a + b, 0) || 1
    const labels = ['1 orang', '2 orang', '3 orang']
    const colors = ['#942835', '#cc974e', '#10b981']
    let cumPct = 0
    return labels.map((label, i) => {
      const pct = (counts[i] / total) * 100
      const start = cumPct
      cumPct += pct
      return { label, count: counts[i], pct: Math.round(pct), start, color: colors[i] }
    })
  }, [bookings])

  const daerahData = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.forEach(b => {
      const key = `${b.daerah}, ${b.negeri}`
      counts[key] = (counts[key] || 0) + (b.bilangan || 1)
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const max = sorted[0]?.[1] || 1
    return sorted.map(([name, count], i) => ({
      name, count, width: (count / max) * 100, color: CHART_COLORS[i % CHART_COLORS.length]
    }))
  }, [bookings])

  const timelineData = useMemo(() => {
    const hourCounts: Record<number, number> = {}
    bookings.forEach(b => {
      const d = new Date(b.created_at)
      const hour = d.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const max = Math.max(...Object.values(hourCounts), 1)
    return hours.map(h => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      count: hourCounts[h] || 0,
      height: ((hourCounts[h] || 0) / max) * 100,
    }))
  }, [bookings])

  if (bookings.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No booking data to analyse yet</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="analytics-stat">
          <div className="analytics-stat-value">{stats.totalBookings}</div>
          <div className="analytics-stat-label">Tempahan</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{stats.totalPeople}</div>
          <div className="analytics-stat-label">Jumlah Orang</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{stats.avgAge}</div>
          <div className="analytics-stat-label">Purata Umur</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value">{stats.checkedIn}</div>
          <div className="analytics-stat-label">Checked In</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value" style={{ fontSize: '1.2rem' }}>
            {stats.topNegeri ? stats.topNegeri[0] : '—'}
          </div>
          <div className="analytics-stat-label">Top Negeri</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat-value" style={{ fontSize: '1.2rem' }}>
            {stats.topSlot ? formatTime(stats.topSlot[0]) : '—'}
          </div>
          <div className="analytics-stat-label">Slot Popular</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid">

        {/* 1. Bookings by Negeri */}
        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h5"/></svg>
            Tempahan Mengikut Negeri
          </h3>
          <div className="hbar-chart">
            {negeriData.map((d, i) => (
              <div key={d.name} className="hbar-row" onClick={() => onFilterChange?.({ field: 'negeri', value: d.name })}>
                <div className="hbar-label">{d.name}</div>
                <div className="hbar-track">
                  <div
                    className="hbar-fill"
                    style={{
                      width: `${d.width}%`,
                      background: d.color,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                <div className="hbar-value">{d.count} <span className="hbar-pct">({d.pct}%)</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Age Distribution */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Taburan Umur
          </h3>
          <div className="vbar-chart">
            {ageData.map((d, i) => (
              <div key={d.label} className="vbar-col">
                <div className="vbar-value">{d.count}</div>
                <div className="vbar-track">
                  <div
                    className="vbar-fill"
                    style={{
                      height: `${d.height}%`,
                      background: d.color,
                      animationDelay: `${i * 80}ms`,
                    }}
                  />
                </div>
                <div className="vbar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Party Size (Bilangan) */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M12 2a10 10 0 0 0 0 20"/></svg>
            Bilangan Orang per Tempahan
          </h3>
          <div className="donut-container">
            <div className="donut-chart" style={{
              background: `conic-gradient(${bilanganData.map(d => `${d.color} ${d.start}% ${d.start + d.pct}%`).join(', ')})`
            }}>
              <div className="donut-center">
                <div className="donut-center-value">{stats.totalBookings}</div>
                <div className="donut-center-label">tempahan</div>
              </div>
            </div>
            <div className="donut-legend">
              {bilanganData.map(d => (
                <div key={d.label} className="donut-legend-item">
                  <span className="donut-legend-dot" style={{ background: d.color }} />
                  <span className="donut-legend-text">{d.label}</span>
                  <span className="donut-legend-count">{d.count} ({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Slot Fill Rates */}
        <div className="chart-card chart-card-wide">
          <h3 className="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Kadar Isian Slot
            <span className="chart-subtitle">Max {EVENT_CONFIG.maxPerSlot} orang per slot</span>
          </h3>
          <div className="slot-bar-chart">
            {slotData.map((d, i) => (
              <div key={d.slot} className="slot-bar-col" onClick={() => onFilterChange?.({ field: 'slot', value: d.slot })}>
                <div className="slot-bar-value" style={{ color: d.color }}>{d.count}</div>
                <div className="slot-bar-track">
                  <div className="slot-bar-capacity" />
                  <div
                    className="slot-bar-fill"
                    style={{
                      height: `${Math.min(d.height, 100)}%`,
                      background: d.color,
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                </div>
                <div className="slot-bar-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Top 10 Daerah */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Top 10 Daerah
          </h3>
          <div className="hbar-chart">
            {daerahData.map((d, i) => (
              <div key={d.name} className="hbar-row">
                <div className="hbar-label" style={{ fontSize: '0.75rem' }}>{d.name}</div>
                <div className="hbar-track">
                  <div
                    className="hbar-fill"
                    style={{
                      width: `${d.width}%`,
                      background: d.color,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
                <div className="hbar-value">{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Booking Timeline */}
        <div className="chart-card">
          <h3 className="chart-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Waktu Tempahan Dibuat
          </h3>
          <div className="timeline-chart">
            {timelineData.map((d, i) => (
              <div key={d.hour} className="timeline-col">
                <div className="timeline-value">{d.count > 0 ? d.count : ''}</div>
                <div className="timeline-track">
                  <div
                    className="timeline-fill"
                    style={{
                      height: `${d.height}%`,
                      background: d.count > 0 ? 'var(--accent)' : 'transparent',
                      opacity: d.count > 0 ? 0.6 + (d.height / 250) : 0,
                      animationDelay: `${i * 30}ms`,
                    }}
                  />
                </div>
                <div className="timeline-label">{d.hour % 3 === 0 ? d.label : ''}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
