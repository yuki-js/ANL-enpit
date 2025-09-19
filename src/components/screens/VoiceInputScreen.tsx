import React, { useState } from 'react'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { Button } from '../ui/Button/Button'
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
              <Button
                variant={connected ? 'secondary' : 'primary'}
                onClick={handleToggleConnection}
                aria-label={connected ? '切断' : '接続'}
              >
                {connected ? '切断' : '接続'}
              </Button>
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
              押し続ける必要はありません。開始/一時停止/停止を明示して操作します。
            </Text>
          </div>

          <div className={styles.controls}>
            {!connected && (
              <Button variant="secondary" disabled>
                録音開始
              </Button>
            )}
            {connected && transport === 'idle' && <Button onClick={start}>録音開始</Button>}
            {connected && isRecording && (
              <>
                <Button variant="secondary" onClick={pause}>
                  一時停止
                </Button>
                <Button variant="secondary" onClick={stop}>
                  停止
                </Button>
              </>
            )}
            {connected && isPaused && (
              <>
                <Button onClick={resume}>再開</Button>
                <Button variant="secondary" onClick={stop}>
                  停止
                </Button>
              </>
            )}
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
        </Panel>
      </div>
    </main>
  )
}

export { VoiceInputScreen }
export default VoiceInputScreen