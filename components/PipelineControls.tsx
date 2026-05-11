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

  return (
    <div style={{ marginTop: '24px', padding: '20px', background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
      <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Run Pipelines</h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        <button onClick={() => run('discover')} disabled={running !== null} style={{ padding: '10px 20px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', opacity: running ? 0.5 : 1 }}>
          {running === 'discover' ? 'Running...' : 'Discover'}
        </button>
        <button onClick={() => run('research')} disabled={running !== null} style={{ padding: '10px 20px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', opacity: running ? 0.5 : 1 }}>
          {running === 'research' ? 'Running...' : 'Research'}
        </button>
        <button onClick={() => run('draft')} disabled={running !== null} style={{ padding: '10px 20px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', opacity: running ? 0.5 : 1 }}>
          {running === 'draft' ? 'Running...' : 'Draft Emails'}
        </button>
      </div>
      {result && <pre style={{ fontSize: '12px', color: '#0af', background: '#0a0a0a', padding: '12px', borderRadius: '6px', overflow: 'auto' }}>{result}</pre>}
    </div>
  )
}