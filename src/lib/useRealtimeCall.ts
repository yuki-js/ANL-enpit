/**
 * React hook for Azure OpenAI GPT-Realtime "call" sessions.
 *
 * Minimal, unified public API:
 * - startCall(opts?): Connects WS + starts mic capture (24kHz 16-bit PCM) and optionally sends session.update
 * - endCall(): Stops mic + disconnects WS
 * - mute()/unmute(): Toggle mic streaming without tearing down the audio graph
 * - setHandlers(): Register event callbacks (onOpen/onClose/onError/onTextDelta/onTranscription/onControl/onAudio)
 *
 * Internals:
 * - Tightly coupled to AzureOpenAIConfig for URL building and validation
 * - Event-driven design; no internal message history storage
 * - Binary audio frames sent as PCM16; JSON frames for control/messages
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import AzureOpenAIConfig from './azureOpenAIConfig'

// --- Status ---

export type RealtimeCallStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected'

export type MicStatus = 'off' | 'on' | 'muted'

// --- Session / Command Shapes (minimal placeholders) ---

export type RealtimeModality = 'audio+text' | 'text-only'

export interface RealtimeSessionConfig {
  instructions?: string
  temperature?: number
  modality?: RealtimeModality
  // Extend with VAD, voice, formats, tools, etc.
}

export interface RealtimeResponseOptions {
  instructions?: string
  temperature?: number
  modality?: RealtimeModality
}

// --- Server Event Shapes (subset, minimal) ---

export interface TextDeltaEvent {
  type: 'text_delta'
  id: string
  delta: string
}

export interface TranscriptionEvent {
  type: 'transcription'
  id: string
  text: string
}

export interface ControlEvent {
  type: 'control'
  action: 'connected' | 'speech_started' | 'text_done' | string
  greeting?: string
  id?: string
}

export interface AudioEvent {
  type: 'audio'
  audioBuffer: ArrayBuffer // raw PCM or to-be-defined format
}

export type RealtimeIncomingEvent =
  | TextDeltaEvent
  | TranscriptionEvent
  | ControlEvent
  | AudioEvent

// --- Handlers (callbacks) ---

export interface RealtimeEventHandlers {
  onTextDelta?: (e: TextDeltaEvent) => void
  onTranscription?: (e: TranscriptionEvent) => void
  onControl?: (e: ControlEvent) => void
  onAudio?: (e: AudioEvent) => void
  onOpen?: () => void
  onClose?: (code?: number, reason?: string) => void
  onError?: (error: unknown) => void
}

// --- Minimal Hook Return I/O Interface ---

export interface UseRealtimeCallIO {
  // State
  status: RealtimeCallStatus
  micStatus: MicStatus
  error?: string

  // Handlers
  setHandlers: (handlers: Partial<RealtimeEventHandlers>) => void

  // Unified call lifecycle (single entrypoints)
  startCall: (opts?: {
    sampleRate?: number
    frameSize?: number
    session?: RealtimeSessionConfig
  }) => Promise<void>
  endCall: () => void

  // Mic control
  mute: () => void
  unmute: () => void
}

// --- Hook Implementation ---

export function useRealtimeCall(): UseRealtimeCallIO {
  // Config (strong coupling to AzureOpenAIConfig)
  const configRef = useRef<AzureOpenAIConfig>(new AzureOpenAIConfig())

  // Minimal state
  const [status, setStatus] = useState<RealtimeCallStatus>('idle')
  const [error, setError] = useState<string | undefined>(undefined)

  // WebSocket transport
  const wsRef = useRef<WebSocket | null>(null)

  // Event handlers storage
  const handlersRef = useRef<RealtimeEventHandlers>({})

  // Mic capture
  const [micStatus, setMicStatus] = useState<MicStatus>('off')
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const mutedRef = useRef<boolean>(false)

  // Pending session.update (sent on open if provided at startCall)
  const pendingSessionRef = useRef<RealtimeSessionConfig | null>(null)

  // Helpers
  const generateId = () => {
    const anyCrypto = typeof crypto !== 'undefined' ? (crypto as any) : undefined
    if (anyCrypto && typeof anyCrypto.randomUUID === 'function') {
      return anyCrypto.randomUUID() as string
    }
    return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  const TARGET_SAMPLE_RATE = 24000

  // Convert Float32 mono samples to 16-bit PCM and downsample to TARGET_SAMPLE_RATE (or provided outSampleRate)
  function toPCM16Buffer(
    input: Float32Array,
    inSampleRate: number,
    outSampleRate: number = TARGET_SAMPLE_RATE,
  ): ArrayBuffer {
    if (outSampleRate === inSampleRate) {
      const l = input.length
      const out = new Int16Array(l)
      for (let i = 0; i < l; i++) {
        let s = Math.max(-1, Math.min(1, input[i]))
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      return out.buffer
    }
    const ratio = inSampleRate / outSampleRate
    const newLen = Math.floor(input.length / ratio)
    const out = new Int16Array(newLen)
    let pos = 0
    let nextPos = ratio
    for (let i = 0; i < newLen; i++) {
      const start = Math.floor(pos)
      const end = Math.floor(nextPos)
      let sum = 0
      let count = 0
      for (let j = start; j < end && j < input.length; j++) {
        sum += input[j]
        count++
      }
      const sample = count > 0 ? sum / count : input[start] ?? 0
      let s = Math.max(-1, Math.min(1, sample))
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      pos = nextPos
      nextPos += ratio
    }
    return out.buffer
  }

  const isOpen = () =>
    !!wsRef.current && wsRef.current.readyState === WebSocket.OPEN

  const callOnError = (err: unknown) => {
    try {
      handlersRef.current.onError?.(err)
    } catch {
      // swallow handler errors
    }
  }

  const sendJSON = (obj: any): boolean => {
    if (!isOpen()) return false
    try {
      wsRef.current!.send(JSON.stringify(obj))
      return true
    } catch (e) {
      setError(String(e))
      setStatus('error')
      callOnError(e)
      return false
    }
  }

  const routeJSONMessage = (payload: any) => {
    if (!payload || typeof payload !== 'object') return
    const t = payload.type
    switch (t) {
      case 'text_delta': {
        const e: TextDeltaEvent = {
          type: 'text_delta',
          id: String(payload.id ?? ''),
          delta: String(payload.delta ?? ''),
        }
        handlersRef.current.onTextDelta?.(e)
        break
      }
      case 'transcription': {
        const e: TranscriptionEvent = {
          type: 'transcription',
          id: String(payload.id ?? ''),
          text: String(payload.text ?? ''),
        }
        handlersRef.current.onTranscription?.(e)
        break
      }
      case 'control': {
        const e: ControlEvent = {
          type: 'control',
          action: String(payload.action ?? 'control'),
          greeting: payload.greeting,
          id: payload.id,
        }
        handlersRef.current.onControl?.(e)
        break
      }
      default:
        // Unknown message type; ignore for now
        break
    }
  }

  // Public API: handlers
  const setHandlers = useCallback((handlers: Partial<RealtimeEventHandlers>) => {
    handlersRef.current = { ...handlersRef.current, ...handlers }
  }, [])

  // Internal: connect WS
  const connect = useCallback(() => {
    setError(undefined)

    // Validate config first
    const v = configRef.current.validateAll()
    if (!v.ok) {
      setStatus('error')
      const msg = `config_invalid: ${v.errors.join(',')}`
      setError(msg)
      callOnError(new Error(msg))
      return
    }

    const wsUrl = configRef.current.buildRealtimeWebSocketUrl(true)
    if (!wsUrl) {
      setStatus('error')
      const msg = 'missing_parameters'
      setError(msg)
      callOnError(new Error(msg))
      return
    }

    // Clean up any existing socket
    try {
      if (wsRef.current && wsRef.current.readyState <= WebSocket.CLOSING) {
        wsRef.current.close()
      }
    } catch {
      // ignore
    }
    wsRef.current = null

    setStatus('connecting')

    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch (e) {
      setStatus('error')
      setError(String(e))
      callOnError(e)
      return
    }
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      if (wsRef.current !== ws) return
      setStatus('connected')
      try {
        handlersRef.current.onOpen?.()
      } catch {
        // ignore handler errors
      }
      // Flush pending session.update if provided at startCall
      if (pendingSessionRef.current) {
        sendJSON({ type: 'session.update', session: pendingSessionRef.current })
        pendingSessionRef.current = null
      }
    }

    ws.onmessage = (evt: MessageEvent) => {
      if (wsRef.current !== ws) return
      const data = evt.data
      if (typeof data === 'string') {
        try {
          const obj = JSON.parse(data)
          routeJSONMessage(obj)
        } catch {
          // ignore malformed frame
        }
      } else if (data instanceof ArrayBuffer) {
        // Binary audio buffer
        handlersRef.current.onAudio?.({ type: 'audio', audioBuffer: data })
      } else if (data instanceof Blob) {
        // Convert Blob to ArrayBuffer
        data
          .arrayBuffer()
          .then((buf) => {
            if (wsRef.current !== ws) return
            handlersRef.current.onAudio?.({ type: 'audio', audioBuffer: buf })
          })
          .catch((e) => callOnError(e))
      } else {
        // ignore
      }
    }

    ws.onerror = (evt) => {
      if (wsRef.current !== ws) return
      setStatus('error')
      setError('websocket_error')
      callOnError(evt)
    }

    ws.onclose = (evt) => {
      if (wsRef.current === ws) {
        wsRef.current = null
      }
      setStatus('disconnected')
      try {
        handlersRef.current.onClose?.(evt.code, evt.reason)
      } catch {
        // ignore
      }
    }
  }, [])

  // Internal: disconnect WS
  const disconnect = useCallback(() => {
    try {
      if (wsRef.current) {
        const ws = wsRef.current
        wsRef.current = null
        ws.close()
      }
    } catch {
      // ignore
    }
    setStatus('disconnected')
  }, [])

  // Internal: outgoing I/O helpers (not exposed)
  const updateSession = useCallback((session: RealtimeSessionConfig) => {
    sendJSON({ type: 'session.update', session })
  }, [])

  const sendText = useCallback((text: string) => {
    const id = generateId()
    sendJSON({ type: 'user_message', id, text })
  }, [])

  const appendAudio = useCallback((chunk: ArrayBuffer | Uint8Array) => {
    if (!isOpen()) return
    try {
      if (chunk instanceof Uint8Array) {
        wsRef.current!.send(chunk)
      } else {
        wsRef.current!.send(chunk)
      }
    } catch (e) {
      setError(String(e))
      setStatus('error')
      callOnError(e)
    }
  }, [])

  const commitAudio = useCallback(() => {
    sendJSON({ type: 'input_audio_buffer.commit' })
  }, [])

  const createResponse = useCallback((opts?: RealtimeResponseOptions) => {
    const payload: any = { type: 'response.create' }
    if (opts) {
      if (typeof opts.instructions !== 'undefined')
        payload.instructions = opts.instructions
      if (typeof opts.temperature !== 'undefined')
        payload.temperature = opts.temperature
      if (typeof opts.modality !== 'undefined')
        payload.modality = opts.modality
    }
    sendJSON(payload)
  }, [])

  // Internal: microphone controls
  const startMic = useCallback(
    async (opts?: { sampleRate?: number; frameSize?: number }) => {
      try {
        // If already started (on/muted), just unmute and return
        if (micStatus !== 'off') {
          mutedRef.current = false
          setMicStatus('on')
          return
        }

        if (
          typeof navigator === 'undefined' ||
          !navigator.mediaDevices?.getUserMedia
        ) {
          const msg = 'mediaDevices.getUserMedia_unavailable'
          setError(msg)
          setStatus('error')
          callOnError(new Error(msg))
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const bufferSize = opts?.frameSize ?? 4096
        const processor = ctx.createScriptProcessor(bufferSize, 1, 1)

        processor.onaudioprocess = (e) => {
          if (mutedRef.current) return
          if (!isOpen()) return

          const inRate = ctx.sampleRate
          const input = e.inputBuffer.getChannelData(0)
          const copy = new Float32Array(input.length)
          copy.set(input)

          const outBuf = toPCM16Buffer(
            copy,
            inRate,
            opts?.sampleRate ?? TARGET_SAMPLE_RATE,
          )
          try {
            // Send as binary frame (raw PCM16)
            wsRef.current!.send(outBuf)
          } catch (err) {
            setError(String(err))
            setStatus('error')
            callOnError(err)
          }
        }

        source.connect(processor)
        // Connect to destination to keep processing alive; no actual output
        processor.connect(ctx.destination)

        mediaStreamRef.current = stream
        audioContextRef.current = ctx
        processorRef.current = processor
        sourceNodeRef.current = source
        mutedRef.current = false
        setMicStatus('on')
      } catch (e) {
        setError(String(e))
        setStatus('error')
        callOnError(e)
      }
    },
    [micStatus],
  )

  const stopMic = useCallback(() => {
    // Stop tracks
    try {
      const ms = mediaStreamRef.current
      if (ms) {
        ms.getTracks().forEach((t) => {
          try {
            t.stop()
          } catch {}
        })
      }
    } catch {}

    // Disconnect audio nodes
    try {
      processorRef.current?.disconnect()
    } catch {}
    try {
      sourceNodeRef.current?.disconnect()
    } catch {}

    // Close audio context
    try {
      const ctx = audioContextRef.current
      if (ctx) void ctx.close()
    } catch {}

    mediaStreamRef.current = null
    audioContextRef.current = null
    processorRef.current = null
    sourceNodeRef.current = null

    mutedRef.current = false
    setMicStatus('off')

    // Optionally commit current audio segment
    commitAudio()
  }, [commitAudio])

  // Unified call lifecycle
  const startCall = useCallback(
    async (opts?: {
      sampleRate?: number
      frameSize?: number
      session?: RealtimeSessionConfig
    }) => {
      // Prepare session.update if provided
      pendingSessionRef.current = opts?.session ?? null
      // Connect socket first, then start microphone capture
      connect()
      await startMic(opts)
      // If WS already connected quickly, also try to send session.update now
      if (opts?.session && isOpen()) {
        updateSession(opts.session)
        pendingSessionRef.current = null
      }
    },
    [connect, startMic, updateSession],
  )

  const endCall = useCallback(() => {
    stopMic()
    disconnect()
  }, [stopMic, disconnect])

  // Public mic toggles
  const mute = useCallback(() => {
    if (micStatus === 'off') return
    mutedRef.current = true
    setMicStatus('muted')
  }, [micStatus])

  const unmute = useCallback(() => {
    if (micStatus !== 'muted') return
    mutedRef.current = false
    setMicStatus('on')
  }, [micStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close()
      } catch {
        // ignore
      }
      wsRef.current = null
      // Also stop mic if still active
      try {
        const ms = mediaStreamRef.current
        if (ms) {
          ms.getTracks().forEach((t) => {
            try {
              t.stop()
            } catch {}
          })
        }
      } catch {}
      mediaStreamRef.current = null
    }
  }, [])

  return {
    status,
    micStatus,
    error,
    setHandlers,
    startCall,
    endCall,
    mute,
    unmute,
  }
}