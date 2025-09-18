/**
 * simple realtime client (browser) for connecting to the middle-tier WebSocket
 *
 * Responsibilities:
 * - Connect to the middle-tier prototype (wss/http URL).
 * - Send control messages: hello, start_audio_stream, stop_audio_stream, user_message.
 * - Accept binary audio frames (Uint8Array) from AudioWorklet/recorder and send as binary.
 * - Expose event callbacks for: onControl, onTextDelta, onTranscription, onBinary (if needed).
 *
 * Notes:
 * - This is intentionally minimal and written to run in the browser without node/openai SDKs.
 * - The server is expected to follow the simple message shapes used in the prototype middle-tier.
 */

export type RealtimeClientOptions = {
  url: string // wss://... or ws://...
  token?: string // optional short-lived token to be appended as query param
}

export type RealtimeClientEvents = {
  onControl?: (payload: any) => void
  onTextDelta?: (id: string, delta: string) => void
  onTranscription?: (id: string, text: string) => void
  onError?: (err: any) => void
  onOpen?: () => void
}

export class RealtimeClient {
  private url: string
  private token?: string
  private ws: WebSocket | null = null
  private events: RealtimeClientEvents = {}

  constructor(opts: RealtimeClientOptions) {
    this.url = opts.url
    this.token = opts.token
  }

  connect() {
    const connectUrl = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url
    this.ws = new WebSocket(connectUrl)

    this.ws.onopen = () => {
      this.events.onOpen && this.events.onOpen()
      // send hello
      this.sendJSON({ type: 'hello' })
    }

    this.ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        let payload: any
        try {
          payload = JSON.parse(ev.data)
        } catch (e) {
          console.warn('Failed to parse incoming JSON', e)
          return
        }
        this.handleMessage(payload)
      } else if (ev.data instanceof Blob) {
        // binary audio or other binary payload
        // convert to ArrayBuffer and forward to onControl or onBinary if needed
        ev.data.arrayBuffer().then((buf) => {
          // For prototype, we don't use binary from server, but keep hook
          // @ts-ignore
          this.events.onControl && this.events.onControl({ type: 'binary', data: buf })
        })
      } else if (ev.data instanceof ArrayBuffer) {
        // direct ArrayBuffer (rare in browsers)
        // @ts-ignore
        this.events.onControl && this.events.onControl({ type: 'binary', data: ev.data })
      }
    }

    this.ws.onerror = (ev) => {
      this.events.onError && this.events.onError(ev)
    }

    this.ws.onclose = () => {
      // nothing for now
    }
  }

  setEvents(events: RealtimeClientEvents) {
    this.events = events
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close()
      } catch (e) {
        // ignore
      }
      this.ws = null
    }
  }

  sendJSON(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(obj))
  }

  sendUserMessage(text: string, id?: string) {
    this.sendJSON({ type: 'user_message', id: id || String(Date.now()), text })
  }

  // Start audio stream - server expects subsequent binary frames
  startAudioStream() {
    this.sendJSON({ type: 'start_audio_stream' })
  }

  stopAudioStream() {
    this.sendJSON({ type: 'stop_audio_stream' })
  }

  // Send raw PCM binary chunk (ArrayBuffer or Uint8Array)
  sendAudioChunk(chunk: ArrayBuffer | Uint8Array) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    if (chunk instanceof ArrayBuffer) {
      this.ws.send(chunk)
    } else if (chunk instanceof Uint8Array) {
      this.ws.send(chunk.buffer)
    }
  }

  private handleMessage(payload: any) {
    switch (payload.type) {
      case 'control':
        this.events.onControl && this.events.onControl(payload)
        break
      case 'text_delta':
        this.events.onTextDelta && this.events.onTextDelta(payload.id, payload.delta)
        break
      case 'transcription':
        this.events.onTranscription && this.events.onTranscription(payload.id, payload.text)
        break
      default:
        this.events.onControl && this.events.onControl(payload)
    }
  }
}

export default RealtimeClient