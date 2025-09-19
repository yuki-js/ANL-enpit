/**
 * React hook (I/O interface only) for connecting and "calling" the GPT-Realtime API (Azure OpenAI Realtime).
 * - Tightly coupled with AzureOpenAIConfig: configuration is read from localStorage via AzureOpenAIConfig.
 * - This file intentionally contains only the external interface (types, method signatures, minimal state).
 * - No side-effectful connection logic is implemented yet; all methods are placeholders for future wiring.
 *
 * Goals:
 * - Minimal, composable, React-hook-appropriate surface
 * - Clear separation of concerns: config storage (AzureOpenAIConfig) vs. realtime transport (to be added)
 * - Avoid premature state bloat (no internal message history here; rely on handlers/callbacks)
 *
 * Expected next steps (not implemented here):
 * - Use AzureOpenAIConfig.buildRealtimeWebSocketUrl(true) for browser-based WSS with api-key query param
 * - Implement WebSocket lifecycle and protocol commands (session.update, input_audio_buffer.append, etc.)
 * - Integrate microphone capture & audio encoding/decoding where applicable (separate module recommended)
 */

import { useRef, useState, useCallback } from 'react'
import AzureOpenAIConfig from './azureOpenAIConfig'
import type { AzureOpenAIConfigShape } from './azureOpenAIConfig'

// --- Status ---

export type RealtimeCallStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected'

// --- Session / Command Shapes (minimal placeholders) ---

export type RealtimeModality = 'audio+text' | 'text-only'

export interface RealtimeSessionConfig {
  // Common session-level options (extend as needed)
  instructions?: string
  temperature?: number
  modality?: RealtimeModality
  // voice?: string
  // audio formats, turn detection, tools etc. can be added later
}

export interface RealtimeResponseOptions {
  // Per-response overrides (extend as needed)
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
  audioBuffer: ArrayBuffer // raw PCM or to be defined format
}

export type RealtimeIncomingEvent = TextDeltaEvent | TranscriptionEvent | ControlEvent | AudioEvent

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

// --- Hook Return I/O Interface ---

export interface UseRealtimeCallIO {
  // State
  status: RealtimeCallStatus
  error?: string

  // Config (masked snapshot; does not expose raw apiKey)
  config: AzureOpenAIConfigShape

  // Handlers
  setHandlers: (handlers: Partial<RealtimeEventHandlers>) => void

  // Lifecycle
  validate: () => { ok: boolean; errors: string[] }
  refreshConfig: () => void
  connect: () => void
  disconnect: () => void

  // Outgoing I/O
  updateSession: (session: RealtimeSessionConfig) => void
  sendText: (text: string) => void
  appendAudio: (chunk: ArrayBuffer | Uint8Array) => void
  commitAudio: () => void
  createResponse: (opts?: RealtimeResponseOptions) => void
}

// --- Hook Implementation (placeholders only) ---

export function useRealtimeCall(): UseRealtimeCallIO {
  // Config (strong coupling to AzureOpenAIConfig as requested)
  const configRef = useRef<AzureOpenAIConfig>(new AzureOpenAIConfig())
  // DO NOT expose raw key; rely on masked snapshot for UI/telemetry safety
  const [configSnap, setConfigSnap] = useState<AzureOpenAIConfigShape>(() => configRef.current.snapshot(false))

  // Minimal state
  const [status, setStatus] = useState<RealtimeCallStatus>('idle')
  const [error, setError] = useState<string | undefined>(undefined)

  // Placeholders for transport
  const wsRef = useRef<WebSocket | null>(null)

  // Event handlers storage
  const handlersRef = useRef<RealtimeEventHandlers>({})

  // Public API: handlers
  const setHandlers = useCallback((handlers: Partial<RealtimeEventHandlers>) => {
    handlersRef.current = { ...handlersRef.current, ...handlers }
  }, [])

  // Public API: lifecycle
  const validate = useCallback(() => {
    return configRef.current.validateAll()
  }, [])

  const refreshConfig = useCallback(() => {
    // Re-read from storage; keep masked view
    setConfigSnap(configRef.current.snapshot(false))
  }, [])

  const connect = useCallback(() => {
    setError(undefined)
    setStatus('connecting')

    // Placeholder logic. To be implemented:
    // - const wsUrl = configRef.current.buildRealtimeWebSocketUrl(true)
    // - Create WebSocket, wire event listeners to call handlersRef.current.*
    // - On open: setStatus('connected'), handlersRef.current.onOpen?.()
    // - On close: setStatus('disconnected'), handlersRef.current.onClose?.(code, reason)
    // - On error: setStatus('error'), setError(String(err)), handlersRef.current.onError?.(err)
  }, [])

  const disconnect = useCallback(() => {
    // Placeholder only
    // - wsRef.current?.close()
    // - wsRef.current = null
    setStatus('disconnected')
  }, [])

  // Public API: outgoing I/O (placeholders)
  const updateSession = useCallback((session: RealtimeSessionConfig) => {
    // To be implemented: send { type: 'session.update', session }
    // via wsRef.current?.send(JSON.stringify(...))
  }, [])

  const sendText = useCallback((text: string) => {
    // To be implemented: send { type: 'user_message', id, text }
  }, [])

  const appendAudio = useCallback((chunk: ArrayBuffer | Uint8Array) => {
    // To be implemented: wsRef.current?.send(binaryFrame)
  }, [])

  const commitAudio = useCallback(() => {
    // To be implemented: send { type: 'input_audio_buffer.commit' }
  }, [])

  const createResponse = useCallback((opts?: RealtimeResponseOptions) => {
    // To be implemented: send { type: 'response.create', ...opts }
  }, [])

  return {
    status,
    error,
    config: configSnap,
    setHandlers,
    validate,
    refreshConfig,
    connect,
    disconnect,
    updateSession,
    sendText,
    appendAudio,
    commitAudio,
    createResponse,
  }
}