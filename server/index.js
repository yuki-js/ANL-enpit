/**
 * Simple middle-tier prototype (Node.js)
 *
 * Notes:
 * - This is a minimal Express + ws WebSocket server that accepts browser WS connections,
 *   forwards simple JSON messages to a configured AOAI/OpenAI realtime endpoint, and
 *   relays responses back to the client.
 * - This prototype does NOT include production-ready auth/token issuance. It's a starting point.
 *
 * Usage:
 * 1. Configure the environment variables below (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, TARGET_URI)
 * 2. Run: node index.js
 *
 * Security Warning:
 * - Never embed real API keys in client-side code. In production, implement short-lived token issuance,
 *   authenticate clients, and lock down CORS/origins.
 */

const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const fetch = require('node-fetch') // lightweight fetch for server-side proxying if needed
const url = require('url')

const PORT = process.env.PORT || 8080
const AOAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '' // e.g., https://your-resource.openai.azure.com
const AOAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '' // keep secret on server
const TARGET_URI = process.env.TARGET_URI || '' // optional: existing target URI the user mentioned

const app = express()
app.use(express.json())

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Endpoint to issue a very simple short-lived token (PLACEHOLDER).
// In production, implement proper auth & token generation (Azure AD, Managed Identity, or signed JWT).
app.post('/token', (req, res) => {
  // For prototype purposes only: return a dummy token object that the browser can use to connect to this middle-tier.
  res.json({
    token: 'prototype-token',
    expiresIn: 60 * 60 // 1 hour
  })
})

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

// Simple helper to log and safe-parse JSON
function safeJSONParse(s) {
  try {
    return JSON.parse(s)
  } catch (e) {
    return null
  }
}

// Each browser client will get a simple proxy session object
wss.on('connection', (ws, req) => {
  console.log('Client connected')

  // Create a connection to AOAI /realtime for this client and proxy messages.
  // NOTE: This implementation uses the provided TARGET_URI if set, otherwise falls back to the AOAI endpoint template.
  // It sends the server-side AZURE_OPENAI_API_KEY in the 'api-key' query param as the AOAI samples mention.
  // This is a prototype — in production use Azure AD or short-lived tokens and proper auth.

  const aoaiUrl = TARGET_URI && TARGET_URI.length
    ? TARGET_URI
    : `${AOAI_ENDPOINT.replace(/\/$/, '')}/openai/realtime?api-version=2024-10-01-preview&deployment=gpt-realtime`

  // Append api-key query param for server-to-AOAI connection (only server side)
  const aoaiUrlWithKey = `${aoaiUrl}${aoaiUrl.includes('?') ? '&' : '?'}api-key=${encodeURIComponent(AOAI_API_KEY)}`

  console.log('Connecting to AOAI realtime at', aoaiUrlWithKey)

  // Create ws connection to AOAI
  const aoaiWs = new WebSocket(aoaiUrlWithKey, {
    // 'ws' client will use TLS when AOAI URL is wss://
  })

  // Forward AOAI messages to browser client
  aoaiWs.on('open', () => {
    console.log('Connected to AOAI realtime')
    // Notify browser client
    ws.send(JSON.stringify({ type: 'control', action: 'aoai_connected' }))
  })

  aoaiWs.on('message', (message, isBinary) => {
    // Proxy binary or text directly to client
    if (isBinary) {
      try {
        ws.send(message, { binary: true })
      } catch (e) {
        console.error('Failed to forward binary to client', e)
      }
      return
    }

    // message is Buffer (node), convert to string
    const msgStr = message.toString()
    ws.send(msgStr)
  })

  aoaiWs.on('error', (err) => {
    console.error('AOAI WS error', err)
    ws.send(JSON.stringify({ type: 'control', action: 'aoai_error', message: String(err) }))
  })

  aoaiWs.on('close', (code, reason) => {
    console.log('AOAI WS closed', code, reason && reason.toString && reason.toString())
    try {
      ws.send(JSON.stringify({ type: 'control', action: 'aoai_closed', code }))
    } catch (e) {}
  })

  // Forward client -> AOAI
  ws.on('message', async (message, isBinary) => {
    if (isBinary) {
      // Forward raw audio binary frames to AOAI
      if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) {
        aoaiWs.send(message, { binary: true })
      }
      return
    }

    const data = safeJSONParse(message)
    if (!data) {
      ws.send(JSON.stringify({ type: 'control', action: 'error', message: 'invalid_json' }))
      return
    }

    switch (data.type) {
      case 'hello':
        // Notify AOAI if needed; also acknowledge client
        ws.send(JSON.stringify({ type: 'control', action: 'connected', greeting: 'hello from middle-tier' }))
        break

      case 'user_message':
        // Map to AOAI's user_message shape and forward
        if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) {
          aoaiWs.send(JSON.stringify({ type: 'user_message', id: data.id || String(Date.now()), text: data.text }))
        } else {
          ws.send(JSON.stringify({ type: 'control', action: 'error', message: 'aoai_not_ready' }))
        }
        break

      case 'start_audio_stream':
        // Signal AOAI to start an audio streaming session if required by the API
        if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) {
          aoaiWs.send(JSON.stringify({ type: 'start_audio_stream' }))
        }
        ws.send(JSON.stringify({ type: 'control', action: 'audio_stream_started' }))
        break

      case 'stop_audio_stream':
        if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) {
          aoaiWs.send(JSON.stringify({ type: 'stop_audio_stream' }))
        }
        ws.send(JSON.stringify({ type: 'control', action: 'audio_stream_stopped' }))
        break

      default:
        // Forward unknown messages to AOAI as-is (useful for custom control messages)
        if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) {
          aoaiWs.send(JSON.stringify(data))
        } else {
          ws.send(JSON.stringify({ type: 'control', action: 'unknown', received: data.type }))
        }
    }
  })

  ws.on('close', () => {
    console.log('Client disconnected')
    try {
      if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) aoaiWs.close()
    } catch (e) {}
  })

  ws.on('error', (err) => {
    console.error('Client WS error', err)
    try {
      if (aoaiWs && aoaiWs.readyState === WebSocket.OPEN) aoaiWs.close()
    } catch (e) {}
  })
})

server.listen(PORT, () => {
  console.log(`Middle-tier prototype listening on port ${PORT}`)
  console.log(`Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY when you wire real AOAI logic.`)
})