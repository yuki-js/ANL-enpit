import React, { useState } from 'react'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { IconButton } from '../ui/IconButton/IconButton'
import { StatusIndicator } from '../ui/StatusIndicator/StatusIndicator'
import styles from './VoiceInputScreen.module.css'

type TransportState = 'idle' | 'recording' | 'paused'

const VoiceInputScreen: React.FC = () => {
  const [connected, setConnected] = useState(false)
  const [transport, setTransport] = useState<TransportState>('idle')
  const [device, setDevice] = useState<string>('default')

  const handleToggleConnection = () => {
    const next = !connected
    setConnected(next)
    // 切断時はUI上のセッション状態をリセット（記憶の連続性も切れる想定）
    if (!next) {
      setTransport('idle')
    }
  }

  const start = () => setTransport('recording')
  const pause = () => setTransport('paused')
  const resume = () => setTransport('recording')
  const stop = () => setTransport('idle')

  const isRecording = transport === 'recording'
  const isPaused = transport === 'paused'

  return (
    <main className={styles.wrap} aria-label="voice-input">
      <div className={styles.inner}>
        <Panel size="large" className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <Text as="h2" variant="h2" color="primary">
                音声入力
              </Text>
              <span className={styles.status}>
                <StatusIndicator
                  status={connected ? (isRecording ? 'busy' : 'online') : 'offline'}
                  size="medium"
                  aria-label={connected ? (isRecording ? '接続中・録音中' : '接続中') : '未接続'}
                />
                <Text as="span" variant="label" color={connected ? 'info' : 'secondary'}>
                  {connected ? (isRecording ? '録音中' : '接続中') : '未接続'}
                </Text>
              </span>
            </div>

            <div className={styles.connectionRow}>
              <Text variant="caption" color="tertiary" className={styles.connectionNote}>
                接続オフにするとセッションの記憶はリセットされます
              </Text>
            </div>
          </div>

          <div className={styles.meterBlock}>
            <div
              className={[
                styles.meter,
                isRecording && styles.recording,
                isPaused && styles.paused,
                !connected && styles.disconnected,
              ]
                .filter(Boolean)
                .join(' ')}
              role="img"
              aria-label="入力レベルビジュアライザ（文字起こしは行いません）"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className={styles.bar} />
              ))}
            </div>
            <Text variant="caption" color="secondary" align="center">
              押し続ける必要はありません。録音はボタンで開始／停止します。
            </Text>
          </div>

          <div className={styles.controls}>
            <IconButton
              className={styles.recordButton}
              sent={isRecording}
              onClick={connected ? (isRecording ? stop : start) : undefined}
              disabled={!connected}
              aria-label={isRecording ? '録音停止' : '録音開始'}
              title={isRecording ? '録音中 — クリックで停止' : '録音開始'}
              aria-pressed={isRecording}
            >
              {isRecording ? (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" fill="currentColor" />
                  <rect x="9" y="9" width="6" height="6" rx="1" fill="#fff" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
                  <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
                </svg>
              )}
            </IconButton>
          </div>

          <div className={styles.settings}>
            <div className={styles.field}>
              <Text as="label" variant="label">
                入力デバイス
              </Text>
              <select
                className={styles.select}
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                aria-label="入力デバイス選択"
              >
                <option value="default">デフォルトマイク</option>
                <option value="external-1">外部マイク 1</option>
                <option value="external-2">外部マイク 2</option>
              </select>
              <Text variant="caption" color="tertiary">
                デバイスの選択はUIのみです。実録音ロジックは後で接続します。
              </Text>
            </div>
          </div>

          {/* MarkdownDocument への遷移ボタンを追加（voice-input から遷移可能にする） */}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                window.location.pathname = '/markdownDocument'
              }}
              style={{ padding: '8px 12px', borderRadius: 8 }}
            >
              文書を開く
            </button>
          </div>
        </Panel>
      </div>
    </main>
  )
}

export { VoiceInputScreen }
export default VoiceInputScreen