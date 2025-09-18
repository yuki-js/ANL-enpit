import React from 'react'
import { Background } from '../ui/Background/Background'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { Button } from '../ui/Button/Button'
import { IconButton } from '../ui/IconButton/IconButton'
import styles from './ChatScreen.module.css'
import RealtimeClient from '../../lib/realtimeClient'

/**
 * ChatScreen
 *
 * 基本的な録音 UI と RealtimeClient を接続する実装。
 * - 録音開始／停止
 * - 中間層の WebSocket へ接続し、transcription / text_delta を受け取り表示
 *
 * 注意:
 * - AudioWorklet を使う実装が望ましいが、このサンプルは ScriptProcessor を用いた簡易実装です。
 * - 中間層接続先は環境変数または window.__MIDDLE_TIER_WS_URL で指定できます。
 */

export const ChatScreen: React.FC = () => {
  const [connected, setConnected] = React.useState(false)
  const [transcript, setTranscript] = React.useState<string>('')
  const [partial, setPartial] = React.useState<string>('')
  const [recording, setRecording] = React.useState(false)
  const clientRef = React.useRef<RealtimeClient | null>(null)
  const mediaStreamRef = React.useRef<MediaStream | null>(null)
  const audioContextRef = React.useRef<AudioContext | null>(null)
  const processorRef = React.useRef<ScriptProcessorNode | null>(null)

  // Connect URL: use provided global or same-origin server
  const WS_URL = (() => {
    if ((window as any).__MIDDLE_TIER_WS_URL) return (window as any).__MIDDLE_TIER_WS_URL
    const origin = window.location.origin
    const wsProto = origin.startsWith('https') ? 'wss' : 'ws'
    return `${wsProto}://${window.location.host}`
  })()

  React.useEffect(() => {
    return () => {
      stopRecording()
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectClient = async () => {
    if (clientRef.current) return
    const client = new RealtimeClient({ url: WS_URL })
    client.setEvents({
      onOpen: () => {
        setConnected(true)
      },
      onControl: (payload) => {
        console.debug('control', payload)
      },
      onTextDelta: (_id, delta) => {
        setPartial((prev) => prev + delta)
      },
      onTranscription: (_id, text) => {
        setTranscript((prev) => prev + (partial ? partial + ' ' : '') + text + '\n')
        setPartial('')
      },
      onError: (err) => {
        console.error(err)
      }
    })
    client.connect()
    clientRef.current = client
  }

  const disconnectClient = () => {
    if (!clientRef.current) return
    clientRef.current.disconnect()
    clientRef.current = null
    setConnected(false)
  }

  const startRecording = async () => {
    if (recording) return
    await connectClient()
    if (!clientRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)

      // ScriptProcessor を使った簡易実装。AudioWorklet を推奨。
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        const downsampled = float32ToInt16(input)
        if (clientRef.current) {
          clientRef.current.sendAudioChunk(downsampled)
        }
      }
      processorRef.current = processor
      source.connect(processor)
      // don't connect processor to destination to avoid echo
      processor.connect(audioCtx.destination)

      clientRef.current.startAudioStream()
      setRecording(true)
    } catch (e) {
      console.error('録音開始に失敗', e)
    }
  }

  const stopRecording = () => {
    if (!recording) return
    if (clientRef.current) clientRef.current.stopAudioStream()

    try {
      processorRef.current && processorRef.current.disconnect()
      audioContextRef.current && audioContextRef.current.close()
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    } catch (e) {
      console.warn('停止時にエラー', e)
    } finally {
      processorRef.current = null
      audioContextRef.current = null
      mediaStreamRef.current = null
      setRecording(false)
    }
  }

  // Float32Array -> Int16 ArrayBuffer
  const float32ToInt16 = (input: Float32Array) => {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    let offset = 0
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return buffer
  }

  const sendText = (text: string) => {
    if (!clientRef.current) return
    clientRef.current.sendUserMessage(text)
  }

  return (
    <>
      <Background />
      <main className={styles.main}>
        <div className={styles.inner}>
          <Panel size="large" aria-label="chat-screen" className={styles.panel}>
            <Text as="h2" variant="h2" color="brand" align="center">
              チャット（音声入力）
            </Text>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
              {!connected ? (
                <Button variant="secondary" size="large" onClick={connectClient}>
                  接続
                </Button>
              ) : (
                <Button variant="secondary" size="large" onClick={disconnectClient}>
                  切断
                </Button>
              )}

              {!recording ? (
                <Button variant="primary" size="large" onClick={startRecording}>
                  録音開始
                </Button>
              ) : (
                <Button variant="primary" size="large" onClick={stopRecording}>
                  録音停止
                </Button>
              )}
            </div>

            <div style={{ marginTop: '1rem', width: '100%' }}>
              <Text variant="body" color="primary">
                リアルタイム転写（一時）
              </Text>
              <div style={{ minHeight: '3rem', padding: '0.75rem', background: 'var(--panel-background)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {partial}
              </div>
            </div>

            <div style={{ marginTop: '1rem', width: '100%' }}>
              <Text variant="body" color="primary">
                完了した転写
              </Text>
              <div style={{ minHeight: '6rem', padding: '0.75rem', background: 'var(--panel-background)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {transcript}
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%' }}>
              <Button variant="secondary" size="medium" onClick={() => sendText(transcript)}>
                送信（テキスト）
              </Button>
              <Button variant="secondary" size="medium" onClick={() => { setTranscript(''); setPartial('') }}>
                消去
              </Button>
            </div>
          </Panel>
        </div>
      </main>
    </>
  )
}

export default ChatScreen