"use client"
import { useState } from 'react'

export default function PipelineControls() {
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function run(type: string) {
    setRunning(type)
    setResult(null)
    try {
      const r = await fetch(`/api/cron/${type}`, { method: 'POST' })
      const d = await r.json()
      setResult(`${type}: ${JSON.stringify(d)}`)
    } catch(e: any) {
      setResult(`${type} error: ${e.message}`)
    }
    setRunning(null)
  }

  // Process queue on demand — processes up to 10 leads immediately
  async function processQueue() {
    setRunning('process')
    setResult(null)
    try {
      const r = await fetch(`/api/cron/process`, { method: 'POST' })
      const d = await r.json()
      setResult(`queue: ${JSON.stringify(d)}`)
    } catch(e: any) {
      setResult(`process error: ${e.message}`)
    }
    setRunning(null)
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => run('discover')}
          disabled={running !== null}
          className="btn btn-primary"
          style={{ opacity: running ? 0.5 : 1 }}
        >
          {running === 'discover' ? 'Running...' : '▶ Discover'}
        </button>
        <button
          onClick={() => run('research')}
          disabled={running !== null}
          className="btn btn-secondary"
          style={{ opacity: running ? 0.5 : 1 }}
        >
          {running === 'research' ? 'Running...' : '🔬 Enqueue Research'}
        </button>
        <button
          onClick={processQueue}
          disabled={running !== null}
          className="btn btn-secondary"
          style={{ opacity: running ? 0.5 : 1 }}
        >
          {running === 'process' ? 'Running...' : '⚡ Process Queue (10)'}
        </button>
        <button
          onClick={() => run('draft')}
          disabled={running !== null}
          className="btn btn-secondary"
          style={{ opacity: running ? 0.5 : 1 }}
        >
          {running === 'draft' ? 'Running...' : '✏️ Draft Emails'}
        </button>
      </div>
      {result && (
        <pre style={{
          marginTop: '16px',
          padding: '14px 16px',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem',
          color: 'var(--accent)',
          fontFamily: '"SF Mono", "Fira Code", monospace',
          overflow: 'auto',
          border: '1px solid var(--border)',
        }}>
          {result}
        </pre>
      )}
    </div>
  )
}