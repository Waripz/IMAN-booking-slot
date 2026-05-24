'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Emel atau kata laluan salah / Invalid email or password'
          : authError.message
        )
        return
      }

      // Redirect to dashboard
      window.location.href = '/admin/dashboard'
    } catch {
      setError('Ralat berlaku / An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main-container">
      <nav className="nav">
        <a href="/" className="nav-brand" style={{ textDecoration: 'none' }}>✦ IMAN Booking Slot</a>
      </nav>

      <div className="admin-login-container fade-in">
        <div className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔐</div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
              Admin Login
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
              Log masuk untuk akses papan pemuka
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Emel / Email</label>
              <input
                id="admin-email"
                className="form-input"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kata Laluan / Password</label>
              <input
                id="admin-password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              id="btn-admin-login"
              className="btn btn-primary btn-block btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Log masuk...</> : 'Log Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
