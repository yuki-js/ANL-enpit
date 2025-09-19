import React, { useState, useRef, useMemo } from 'react'
import Panel from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { Input } from '../ui/Input/Input'
import { Button } from '../ui/Button/Button'
import { StatusIndicator } from '../ui/StatusIndicator/StatusIndicator'
import { useRealtimeCall } from '../../lib/useRealtimeCall'
import type { RealtimeCallStatus, MicStatus, RealtimeSessionConfig, TextDeltaEvent, TranscriptionEvent, ControlEvent, AudioEvent } from '../../lib/useRealtimeCall'
import AzureOpenAIConfig from '../../lib/azureOpenAIConfig'


const statusToIndicator = (status: RealtimeCallStatus): 'online' | 'busy' | 'error' | 'offline' | 'info' => {
  switch (status) {
    case 'connected': return 'online'
    case 'connecting': return 'busy'
    case 'error': return 'error'
    case 'disconnected': return 'offline'
    default: return 'info'
  }
}

const micToIndicator = (mic: MicStatus): 'online' | 'busy' | 'error' | 'offline' | 'info' => {
  switch (mic) {
    case 'on': return 'online'
    case 'muted': return 'busy'
    case 'off': return 'offline'
    default: return 'info'
  }
}

const RealtimeDebugScreen: React.FC = () => {
  const {
    status,
    micStatus,
    error,
    setHandlers,
    startCall,
    endCall,
    mute,
    unmute,
  } = useRealtimeCall()

  // Azure config validity check
  const azureConfig = useMemo(() => new AzureOpenAIConfig(), [])
  const configValid = useMemo(() => azureConfig.validateAll(), [azureConfig])
  const configErrorMsg = !configValid.ok ? `Azure OpenAI設定が不正です: ${configValid.errors.join(', ')}` : null

  // Session config state
  const [instructions, setInstructions] = useState('')
  const [temperature, setTemperature] = useState(0.7)

  // Event logs
  const [events, setEvents] = useState<any[]>([])
  const eventsRef = useRef<any[]>([])
  // Text input for sending user message (if needed)
  const [userText, setUserText] = useState('')

  // Register event handlers
  React.useEffect(() => {
    setHandlers({
      onTextDelta: (e: TextDeltaEvent) => {
        eventsRef.current.push({ ...e })
        setEvents([...eventsRef.current])
      },
      onTranscription: (e: TranscriptionEvent) => {
        eventsRef.current.push({ ...e })
        setEvents([...eventsRef.current])
      },
      onControl: (e: ControlEvent) => {
        eventsRef.current.push({ ...e })
        setEvents([...eventsRef.current])
      },
      onAudio: (e: AudioEvent) => {
        eventsRef.current.push({ ...e })
        setEvents([...eventsRef.current])
      },
      onOpen: () => {
        eventsRef.current.push({ type: 'open' })
        setEvents([...eventsRef.current])
      },
      onClose: (code?: number, reason?: string) => {
        eventsRef.current.push({ type: 'close', code, reason })
        setEvents([...eventsRef.current])
      },
      onError: (err: unknown) => {
        eventsRef.current.push({ type: 'error', error: String(err) })
        setEvents([...eventsRef.current])
      },
    })
    // eslint-disable-next-line
  }, [])

  // Start call handler
  const handleStart = async () => {
    if (!configValid.ok) return
    try {
      await startCall({
        session: {
          instructions: instructions || undefined,
          temperature,
        },
      })
    } catch (e) {
      eventsRef.current.push({ type: 'error', error: String(e) })
      setEvents([...eventsRef.current])
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px' }}>
      <Text as="h2" variant="h2" color="brand" style={{ marginBottom: 16 }}>
        Realtime Call Debug UI
      </Text>
      {!configValid.ok && (
        <Panel size="medium">
          <div style={{ marginBottom: 24, background: '#fffbe6', border: '1px solid #ffe58f', padding: 16 }}>
            <Text variant="body" color="error">
              {configErrorMsg}
            </Text>
            <Text variant="caption" color="tertiary" style={{ marginTop: 8 }}>
              <a href="/settings" style={{ color: '#faad14', textDecoration: 'underline' }}>
                設定画面でAzure OpenAI情報を入力してください
              </a>
            </Text>
          </div>
        </Panel>
      )}
      <Panel size="large">
        <div style={{ display: 'grid', gap: 24, padding: 24 }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <StatusIndicator status={statusToIndicator(status)} size="medium" />
            <Text variant="bodyLarge" color="info">
              Status: {status}
            </Text>
            <StatusIndicator status={micToIndicator(micStatus)} size="medium" />
            <Text variant="bodyLarge" color="info">
              Mic: {micStatus}
            </Text>
            {error && (
              <Text variant="body" color="error">
                Error: {error}
              </Text>
            )}
          </div>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button
              onClick={handleStart}
              disabled={status === 'connected' || status === 'connecting' || !configValid.ok}
            >
              Start Call
            </Button>
            <Button onClick={endCall} variant="secondary" disabled={status !== 'connected' && status !== 'connecting'}>
              End Call
            </Button>
            <Button onClick={mute} variant="secondary" disabled={micStatus !== 'on'}>
              Mute
            </Button>
            <Button onClick={unmute} variant="secondary" disabled={micStatus !== 'muted'}>
              Unmute
            </Button>
          </div>
          {/* Session Config */}
          <div style={{ display: 'grid', gap: 12 }}>
            <Text as="label" variant="label">Instructions</Text>
            <Input
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Session instructions"
              size="large"
            />
            <Text as="label" variant="label">Temperature</Text>
            <Input
              type="number"
              value={temperature}
              onChange={e => setTemperature(Number(e.target.value))}
              min={0}
              max={2}
              step={0.01}
              size="large"
            />
          </div>
          {/* Event Log */}
          <Panel size="medium">
            <div style={{ maxHeight: 320, overflowY: 'auto', background: '#f8f9fa', padding: 8 }}>
              <Text variant="label" color="secondary">Event Log</Text>
              <div style={{ fontSize: '0.95rem', color: '#374151', fontFamily: 'IBM Plex Mono, monospace', marginTop: 8 }}>
                {events.length === 0 ? (
                  <Text variant="caption" color="tertiary">No events yet.</Text>
                ) : (
                  events.slice(-50).reverse().map((ev, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <Text variant="monoSmall" color="info">
                        {JSON.stringify(ev)}
                      </Text>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
        </div>
      </Panel>
    </div>
  )
}

export default RealtimeDebugScreen