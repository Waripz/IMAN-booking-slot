'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { formatTime, formatDate, getEventDates, ALL_SLOT_TIMES } from '@/lib/constants'

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
  created_at: string
}

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'tally'>('table')
  const [filterDate, setFilterDate] = useState('')
  const [filterSlot, setFilterSlot] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [lang] = useState<'ms' | 'en'>('ms')

  const eventDates = getEventDates()

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('event_date', { ascending: true })
        .order('slot_time', { ascending: true })
        .order('created_at', { ascending: true })

      if (filterDate) {
        query = query.eq('event_date', filterDate)
      }
      if (filterSlot) {
        query = query.eq('slot_time', filterSlot)
      }

      const { data, error } = await query

      if (error) {
        console.error('Fetch error:', error)
        return
      }

      setBookings(data || [])
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, filterDate, filterSlot])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }

  // Filter by search query
  const filtered = bookings.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.nama.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.booking_ref.toLowerCase().includes(q) ||
      b.no_telefon.includes(q) ||
      b.daerah.toLowerCase().includes(q) ||
      b.negeri.toLowerCase().includes(q)
    )
  })

  // Stats
  const totalBookings = bookings.length
  const today = new Date().toISOString().split('T')[0]
  const todayBookings = bookings.filter(b => b.event_date === today).length
  const totalCapacity = eventDates.length * ALL_SLOT_TIMES.length * 30
  const capacityPercent = totalCapacity > 0 ? ((totalBookings / totalCapacity) * 100).toFixed(1) : '0'

  // Group for tally view
  const tallyGroups = filtered.reduce((acc, b) => {
    const key = `${b.event_date}|${b.slot_time}`
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {} as Record<string, Booking[]>)

  // CSV Export
  const exportCSV = () => {
    const headers = ['Ref', 'Date', 'Time', 'Name', 'Email', 'Phone', 'Age', 'Area', 'State', 'Created']
    const rows = filtered.map(b => [
      b.booking_ref,
      b.event_date,
      b.slot_time,
      b.nama,
      b.email,
      b.no_telefon,
      b.umur.toString(),
      b.daerah,
      b.negeri,
      new Date(b.created_at).toLocaleString(),
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `IMAN-bookings-${filterDate || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="main-container">
      {/* Navigation */}
      <nav className="nav">
        <a href="/" className="nav-brand" style={{ textDecoration: 'none' }}>✦ IMAN Booking Slot</a>
        <div className="nav-actions">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Admin</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Log Keluar
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="admin-header fade-in">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800 }}>
            {lang === 'ms' ? 'Papan Pemuka' : 'Dashboard'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {lang === 'ms' ? 'Pengurusan tempahan acara IMAN' : 'IMAN event booking management'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchBookings()}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards fade-in">
        <div className="stat-card">
          <div className="stat-value">{totalBookings}</div>
          <div className="stat-label">{lang === 'ms' ? 'Jumlah Tempahan' : 'Total Bookings'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayBookings}</div>
          <div className="stat-label">{lang === 'ms' ? 'Tempahan Hari Ini' : "Today's Bookings"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{capacityPercent}%</div>
          <div className="stat-label">{lang === 'ms' ? 'Kapasiti Digunakan' : 'Capacity Used'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">{lang === 'ms' ? 'Ditapis' : 'Filtered'}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar fade-in">
        <input
          className="form-input"
          type="text"
          placeholder={lang === 'ms' ? 'Cari nama, emel, rujukan...' : 'Search name, email, ref...'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          className="form-input"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        >
          <option value="">{lang === 'ms' ? 'Semua Tarikh' : 'All Dates'}</option>
          {eventDates.map(d => (
            <option key={d} value={d}>{formatDate(d, lang)}</option>
          ))}
        </select>
        <select
          className="form-input"
          value={filterSlot}
          onChange={e => setFilterSlot(e.target.value)}
        >
          <option value="">{lang === 'ms' ? 'Semua Slot' : 'All Slots'}</option>
          {ALL_SLOT_TIMES.map(s => (
            <option key={s} value={s}>{formatTime(s)}</option>
          ))}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button
            className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('table')}
          >
            📋 {lang === 'ms' ? 'Jadual' : 'Table'}
          </button>
          <button
            className={`btn btn-sm ${view === 'tally' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('tally')}
          >
            📊 Tally
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card">
          <div className="skeleton" style={{ height: 400 }} />
        </div>
      ) : view === 'table' ? (
        /* Table View */
        <div className="glass-card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>{lang === 'ms' ? 'Tiada tempahan dijumpai' : 'No bookings found'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ref</th>
                    <th>{lang === 'ms' ? 'Tarikh' : 'Date'}</th>
                    <th>{lang === 'ms' ? 'Masa' : 'Time'}</th>
                    <th>{lang === 'ms' ? 'Nama' : 'Name'}</th>
                    <th>{lang === 'ms' ? 'Emel' : 'Email'}</th>
                    <th>{lang === 'ms' ? 'Telefon' : 'Phone'}</th>
                    <th>{lang === 'ms' ? 'Umur' : 'Age'}</th>
                    <th>{lang === 'ms' ? 'Daerah' : 'Area'}</th>
                    <th>{lang === 'ms' ? 'Negeri' : 'State'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'var(--accent)',
                          fontSize: '0.8rem',
                        }}>
                          {b.booking_ref}
                        </span>
                      </td>
                      <td>{formatDate(b.event_date, lang)}</td>
                      <td>{formatTime(b.slot_time)}</td>
                      <td style={{ fontWeight: 500 }}>{b.nama}</td>
                      <td>{b.email}</td>
                      <td>{b.no_telefon}</td>
                      <td>{b.umur}</td>
                      <td>{b.daerah}</td>
                      <td>{b.negeri}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tally View */
        <div className="tally-grid fade-in">
          {Object.keys(tallyGroups).length === 0 ? (
            <div className="glass-card">
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>{lang === 'ms' ? 'Tiada tempahan dijumpai' : 'No bookings found'}</p>
              </div>
            </div>
          ) : (
            Object.entries(tallyGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, items]) => {
                const [date, time] = key.split('|')
                return (
                  <div key={key} className="tally-card">
                    <div className="tally-header">
                      <div>
                        <div className="tally-time">{formatTime(time)}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {formatDate(date, lang)}
                        </div>
                      </div>
                      <div className="tally-count">
                        <span style={{
                          fontWeight: 700,
                          color: items.length >= 30 ? 'var(--danger)' : items.length >= 20 ? 'var(--warning)' : 'var(--success)',
                        }}>
                          {items.length}
                        </span>
                        /30
                      </div>
                    </div>
                    <ul className="tally-list">
                      {items.map((b, i) => (
                        <li key={b.id} className="tally-item">
                          <span className="tally-name">
                            <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: '0.75rem' }}>
                              {i + 1}.
                            </span>
                            {b.nama}
                          </span>
                          <span className="tally-ref">{b.booking_ref}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
          )}
        </div>
      )}

      <div style={{ height: 60 }} />
    </div>
  )
}
