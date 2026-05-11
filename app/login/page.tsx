'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError(true)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#111',
        padding: '48px',
        borderRadius: '12px',
        border: '1px solid #222',
        width: '100%',
        maxWidth: '360px',
      }}>
        <h1 style={{ color: '#fff', marginBottom: '8px', fontSize: '24px' }}>GTM Pipeline</h1>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>Enter password to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%',
              padding: '12px',
              background: '#0a0a0a',
              border: error ? '1px solid #e53' : '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '16px',
            }}
          />
          {error && (
            <p style={{ color: '#e53', fontSize: '13px', marginBottom: '16px' }}>
              Incorrect password
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}