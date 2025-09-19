import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { IconButton } from '../ui/IconButton/IconButton'
import { StatusIndicator } from '../ui/StatusIndicator/StatusIndicator'
import { Button } from '../ui/Button/Button'
import { useRealtimeCall } from '../../lib/useRealtimeCall'
import styles from './VoiceInputScreen.module.css'

const VoiceInputScreen: React.FC = () => {
  // Device selection remains purely UI for now
  const [device, setDevice] = useState<string>('default')

  // Realtime call hook
  const { status, micStatus, error, setHandlers, startCall, endCall, mute, unmute } =
    useRealtimeCall()

  // Derived flags for UI
  const connected = useMemo(() => status === 'connected' || status === 'connecting', [status])
  const isRecording = micStatus === 'on'
  const isPaused = micStatus === 'muted'

  // Register simple handlers (no heavy logic here)
  useEffect(() => {
    setHandlers({
      onOpen: () => {
        // could show toast or update analytics - keep minimal here
        // console.log('realtime: open')
      },
      onClose: () => {
        // console.log('realtime: closed')
      },
      onError: (e) => {
        // console.warn('realtime error', e)
      },
    })
  }, [setHandlers])

  // Toggle connection: connect -> startCall (then mute to avoid immediate audio),
  // disconnect -> endCall
  const handleToggleConnection = useCallback(async () => {
    if (!connected) {
      try {
        // Start call (opens WS + starts mic). Immediately mute so user can explicitly start recording.
        await startCall({ sampleRate: 24000, frameSize: 4096 })
        // Ensure muted after connecting so UI shows connected but not recording.
        mute()
      } catch (e) {
        // startCall surfaces errors via hook.error / onError handler
      }
    } else {
      endCall()
    }
  }, [connected, startCall, endCall, mute])

  // Recording toggle: unmute -> start sending audio, mute -> pause audio
  const toggleRecording = useCallback(() => {
    if (!connected) return
    if (isRecording) {
      mute()
    } else {
      // If currently 'off' (shouldn't normally happen when connected), calling unmute will only work when mic exists.
      unmute()
    }
  }, [connected, isRecording, mute, unmute])

  // UI status label
  const statusLabel = useMemo(() => {
    if (status === 'connecting') return '接続中...'
    if (status === 'connected') return isRecording ? '録音中' : '接続中'
    if (status === 'error') return 'エラー'
    return '未接続'
  }, [status, isRecording])

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
                  {statusLabel}
                </Text>
              </span>
            </div>

            <div className={styles.connectionRow}>
              <Text variant="caption" color="tertiary" className={styles.connectionNote}>
                接続オフにするとセッションの記憶はリセットされます
              </Text>

              <div>
                <Button
                  variant={connected ? 'secondary' : 'primary'}
                  size="medium"
                  onClick={handleToggleConnection}
                  title={connected ? '接続を切断する' : '接続する'}
                >
                  {connected ? '切断' : '接続'}
                </Button>
              </div>
            </div>

            {error && (
              <Text variant="caption" color="error">
                {String(error)}
              </Text>
            )}
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
              onClick={connected ? toggleRecording : undefined}
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
        </Panel>
      </div>
    </main>
  )
}

export { VoiceInputScreen }
export default VoiceInputScreen