'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { formatTime, formatDate, getEventDates, ALL_SLOT_TIMES, EVENT_CONFIG } from '@/lib/constants'
import ScannerView from './ScannerView'
import AnalyticsView from './AnalyticsView'

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

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'tally' | 'scanner' | 'checked' | 'analytics'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const [filterDate, setFilterDate] = useState('')
  const [filterSlot, setFilterSlot] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [checkedDate, setCheckedDate] = useState('')
  const [checkedSlot, setCheckedSlot] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

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

      if (filterDate) query = query.eq('event_date', filterDate)
      if (filterSlot) query = query.eq('slot_time', filterSlot)

      const { data, error } = await query
      if (error) { console.error('Fetch error:', error); return }
      setBookings(data || [])
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, filterDate, filterSlot])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  // Reset pagination when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, filterDate, filterSlot])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin'
  }

  const cancelBooking = async (ref: string, name: string) => {
    if (!confirm(`Cancel booking for ${name} (${ref})?`)) return
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: ref }),
      })
      const data = await res.json()
      if (data.success) {
        fetchBookings()
      } else {
        alert('Failed to cancel booking')
      }
    } catch {
      alert('Network error')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id)))
    }
  }

  const bulkCancel = async () => {
    const count = selectedIds.size
    if (!confirm(`Cancel ${count} booking${count > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    try {
      const refs = bookings.filter(b => selectedIds.has(b.id)).map(b => b.booking_ref)
      let successCount = 0
      for (const ref of refs) {
        const res = await fetch('/api/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_ref: ref }),
        })
        const data = await res.json()
        if (data.success) successCount++
      }
      setSelectedIds(new Set())
      fetchBookings()
      alert(`Successfully cancelled ${successCount} of ${count} bookings.`)
    } catch {
      alert('Network error during bulk cancel')
    } finally {
      setBulkDeleting(false)
    }
  }

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

  const totalPeople = bookings.reduce((sum, b) => sum + (b.bilangan || 1), 0)
  const today = new Date().toISOString().split('T')[0]
  const todayPeople = bookings.filter(b => b.event_date === today).reduce((sum, b) => sum + (b.bilangan || 1), 0)
  const totalCapacity = eventDates.length * ALL_SLOT_TIMES.length * EVENT_CONFIG.maxPerSlot
  const capacityPercent = totalCapacity > 0 ? ((totalPeople / totalCapacity) * 100).toFixed(1) : '0'
  const checkedInCount = bookings.filter(b => b.checked_in).length

  const tallyGroups = filtered.reduce((acc, b) => {
    const key = `${b.event_date}|${b.slot_time}`
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {} as Record<string, Booking[]>)

  const exportCSV = () => {
    const headers = ['Ref', 'Date', 'Time', 'Name', 'Qty', 'Email', 'Phone', 'Age', 'Area', 'State', 'Checked In', 'Created']
    const rows = filtered.map(b => [
      b.booking_ref, b.event_date, b.slot_time, b.nama, (b.bilangan || 1).toString(), b.email,
      b.no_telefon, b.umur.toString(), b.daerah, b.negeri,
      b.checked_in ? 'Yes' : 'No',
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
      <nav className="nav">
        <a href="/" className="nav-brand" style={{ textDecoration: 'none' }}>Tempah Waktu Lawatan Galeri Anda</a>
        <div className="nav-actions">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Admin</span>
          <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Header */}
      <div className="admin-header fade-in">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>IMAN event booking management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchBookings()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={exportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards fade-in">
        <div className="stat-card">
          <div className="stat-value">{totalPeople}</div>
          <div className="stat-label">Total People</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayPeople}</div>
          <div className="stat-label">{"Today's People"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{capacityPercent}%</div>
          <div className="stat-label">Capacity Used</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{checkedInCount}</div>
          <div className="stat-label">Checked In</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar fade-in">
        <input className="form-input" type="text" placeholder="Search name, email, ref..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <select className="form-input" value={filterDate} onChange={e => setFilterDate(e.target.value)}>
          <option value="">All Dates</option>
          {eventDates.map(d => (<option key={d} value={d}>{formatDate(d, 'en')}</option>))}
        </select>
        <select className="form-input" value={filterSlot} onChange={e => setFilterSlot(e.target.value)}>
          <option value="">All Slots</option>
          {ALL_SLOT_TIMES.map(s => (<option key={s} value={s}>{formatTime(s)}</option>))}
        </select>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('table')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Table
          </button>
          <button className={`btn btn-sm ${view === 'tally' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('tally')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            Tally
          </button>
          <button className={`btn btn-sm ${view === 'scanner' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('scanner')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
            Scanner
          </button>
          <button className={`btn btn-sm ${view === 'checked' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('checked')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
            Checked In
          </button>
          <button className={`btn btn-sm ${view === 'analytics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('analytics')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            Analytics
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'analytics' ? (
        <AnalyticsView bookings={filtered} />
      ) : view === 'scanner' ? (
        <ScannerView />
      ) : view === 'checked' ? (
        <div className="fade-in">
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.85rem' }}>
            <button className="btn btn-ghost" onClick={() => { setCheckedDate(''); setCheckedSlot('') }} style={{ fontWeight: checkedDate ? 400 : 600, color: checkedDate ? 'var(--text-muted)' : 'var(--accent)' }}>Checked In ({bookings.filter(b => b.checked_in).reduce((sum, b) => sum + (b.bilangan || 1), 0)})</button>
            {checkedDate && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                <button className="btn btn-ghost" onClick={() => setCheckedSlot('')} style={{ fontWeight: checkedSlot ? 400 : 600, color: checkedSlot ? 'var(--text-muted)' : 'var(--accent)' }}>{formatDate(checkedDate, 'en')}</button>
              </>
            )}
            {checkedSlot && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatTime(checkedSlot)}</span>
              </>
            )}
          </div>

          {/* Level 1: Date list */}
          {!checkedDate && (
            <div className="date-grid">
              {eventDates.map(date => {
                const count = bookings.filter(b => b.checked_in && b.event_date === date).reduce((sum, b) => sum + (b.bilangan || 1), 0)
                const total = bookings.filter(b => b.event_date === date).reduce((sum, b) => sum + (b.bilangan || 1), 0)
                const d = new Date(date + 'T00:00:00')
                return (
                  <div key={date} className={`date-card ${count > 0 ? '' : ''}`} onClick={() => setCheckedDate(date)} style={{ cursor: 'pointer' }}>
                    <div className="date-card-day">{d.getDate()}</div>
                    <div className="date-card-label">{formatDate(date, 'en')}</div>
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: count > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700 }}>{count}</span>/{total} checked in
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Level 2: Time slots for selected date */}
          {checkedDate && !checkedSlot && (
            <div className="slot-grid">
              {ALL_SLOT_TIMES.map(slot => {
                const checked = bookings.filter(b => b.checked_in && b.event_date === checkedDate && b.slot_time === slot).reduce((sum, b) => sum + (b.bilangan || 1), 0)
                const total = bookings.filter(b => b.event_date === checkedDate && b.slot_time === slot).reduce((sum, b) => sum + (b.bilangan || 1), 0)
                return (
                  <div key={slot} className="slot-card" onClick={() => setCheckedSlot(slot)} style={{ cursor: 'pointer' }}>
                    <div className="slot-time">{formatTime(slot)}</div>
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: checked > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700 }}>{checked}</span>/{total} checked in
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Level 3: People list for selected date + slot */}
          {checkedDate && checkedSlot && (() => {
            const people = bookings.filter(b => b.event_date === checkedDate && b.slot_time === checkedSlot)
            return (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)' }}>{formatDate(checkedDate, 'en')} &middot; {formatTime(checkedSlot)}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{people.filter(p => p.checked_in).reduce((sum, b) => sum + (b.bilangan || 1), 0)}/{people.reduce((sum, b) => sum + (b.bilangan || 1), 0)} checked in</span>
                </div>
                {people.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No bookings for this slot</p>
                ) : (
                  <div className="table-container" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>#</th><th>Ref</th><th>Name</th><th>Phone</th><th>Area</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {people.map((b, i) => (
                          <tr key={b.id}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)', fontSize: '0.8rem' }}>{b.booking_ref}</span></td>
                            <td style={{ fontWeight: 500 }}>{b.nama}</td>
                            <td>{b.no_telefon}</td>
                            <td>{b.daerah}, {b.negeri}</td>
                            <td>
                              {b.checked_in ? (
                                <span className="badge-available" style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>Checked In</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Not yet</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      ) : loading ? (
        <div className="glass-card"><div className="skeleton" style={{ height: 400 }} /></div>
      ) : view === 'table' ? (() => {
        const totalPages = Math.ceil(filtered.length / rowsPerPage)
        const startIdx = (currentPage - 1) * rowsPerPage
        const endIdx = Math.min(startIdx + rowsPerPage, filtered.length)
        const pageData = filtered.slice(startIdx, endIdx)

        const getPageNumbers = () => {
          const pages: (number | '...')[] = []
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
          } else {
            pages.push(1)
            if (currentPage > 3) pages.push('...')
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
            if (currentPage < totalPages - 2) pages.push('...')
            pages.push(totalPages)
          }
          return pages
        }

        return (
        <div className="glass-card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <p>No bookings found</p>
            </div>
          ) : (
            <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="bulk-checkbox"
                        checked={pageData.length > 0 && pageData.every(b => selectedIds.has(b.id))}
                        onChange={() => {
                          const pageIds = pageData.map(b => b.id)
                          const allSelected = pageIds.every(id => selectedIds.has(id))
                          setSelectedIds(prev => {
                            const next = new Set(prev)
                            pageIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
                            return next
                          })
                        }}
                        title="Select page"
                      />
                    </th>
                    <th>#</th><th>Ref</th><th>Date</th><th>Time</th><th>Name</th><th>Qty</th>
                    <th>Email</th><th>Phone</th><th>Age</th><th>Area</th><th>State</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((b, i) => (
                    <tr key={b.id} className={selectedIds.has(b.id) ? 'row-selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="bulk-checkbox"
                          checked={selectedIds.has(b.id)}
                          onChange={() => toggleSelect(b.id)}
                        />
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{startIdx + i + 1}</td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)', fontSize: '0.8rem' }}>{b.booking_ref}</span></td>
                      <td>{formatDate(b.event_date, 'en')}</td>
                      <td>{formatTime(b.slot_time)}</td>
                      <td style={{ fontWeight: 500 }}>{b.nama}</td>
                      <td><span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: (b.bilangan || 1) > 1 ? 'var(--accent)' : 'var(--text-primary)' }}>{b.bilangan || 1}</span></td>
                      <td>{b.email}</td>
                      <td>{b.no_telefon}</td>
                      <td>{b.umur}</td>
                      <td>{b.daerah}</td>
                      <td>{b.negeri}</td>
                      <td>
                        {b.checked_in ? (
                          <span className="badge-available" style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>Checked In</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost" onClick={() => cancelBooking(b.booking_ref, b.nama)} style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '4px 8px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing <strong>{startIdx + 1}–{endIdx}</strong> of <strong>{filtered.length}</strong> bookings
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} title="First">
                    «
                  </button>
                  <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} title="Previous">
                    ‹
                  </button>
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="pagination-dots">…</span>
                    ) : (
                      <button key={p} className={`pagination-btn ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p as number)}>
                        {p}
                      </button>
                    )
                  )}
                  <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} title="Next">
                    ›
                  </button>
                  <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} title="Last">
                    »
                  </button>
                </div>
                <div className="pagination-size">
                  <label>Rows:</label>
                  <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }}>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
            </>
          )}
        </div>
        )
      })() : (
        /* Tally View */
        <div className="tally-grid fade-in">
          {Object.keys(tallyGroups).length === 0 ? (
            <div className="glass-card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <p>No bookings found</p>
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
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(date, 'en')}</div>
                      </div>
                      <div className="tally-count">
                        <span style={{ fontWeight: 700, color: items.reduce((s, b) => s + (b.bilangan || 1), 0) >= EVENT_CONFIG.maxPerSlot ? 'var(--danger)' : items.reduce((s, b) => s + (b.bilangan || 1), 0) >= EVENT_CONFIG.maxPerSlot * 0.67 ? 'var(--warning)' : 'var(--success)' }}>{items.reduce((s, b) => s + (b.bilangan || 1), 0)}</span>/{EVENT_CONFIG.maxPerSlot}
                      </div>
                    </div>
                    <ul className="tally-list">
                      {items.map((b, i) => (
                        <li key={b.id} className="tally-item">
                          <span className="tally-name">
                            <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: '0.75rem' }}>{i + 1}.</span>
                            {b.nama}
                            {(b.bilangan || 1) > 1 && (
                              <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>×{b.bilangan}</span>
                            )}
                            {b.checked_in && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6, verticalAlign: 'middle' }}><polyline points="20 6 9 17 4 12"/></svg>
                            )}
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bulk-action-bar fade-in">
          <div className="bulk-action-info">
            <input
              type="checkbox"
              className="bulk-checkbox"
              checked={true}
              onChange={() => setSelectedIds(new Set())}
            />
            <span><strong>{selectedIds.size}</strong> booking{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="bulk-action-buttons">
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
            <button className="btn btn-sm" onClick={bulkCancel} disabled={bulkDeleting}
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              {bulkDeleting ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} /> Cancelling...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Cancel Selected</>
              )}
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 60 }} />
    </div>
  )
}
