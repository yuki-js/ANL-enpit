import React, { useMemo, useState } from 'react'
import { Background } from '../ui/Background/Background'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { IconButton } from '../ui/IconButton/IconButton'
import styles from './ChatScreen.module.css'

/**
 * ChatScreen
 *
 * プレースホルダーのチャット画面。実際のチャット機能は別途実装してください。
 * この画面には音声入力のオン/オフを切り替えるマイクボタンを配置します（UIのみ）。
 */

// Simple inline SVG icons
const MicIcon: React.FC<{ title?: string }> = ({ title }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    {title ? <title>{title}</title> : null}
    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
  </svg>
)

const MicOffIcon: React.FC<{ title?: string }> = ({ title }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    role="img"
    aria-label={title}
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    {title ? <title>{title}</title> : null}
    <path d="M15 11V6a3 3 0 0 0-5.356-1.856l1.45 1.45A1.99 1.99 0 0 1 13 6v5a3 3 0 0 0 .254 1.2l1.6 1.6A4.97 4.97 0 0 0 15 11zM4.41 3.16 3 4.57l5.07 5.07A4.99 4.99 0 0 0 9 11a5 5 0 0 0 5 5c.544 0 1.066-.09 1.554-.254l2.879 2.879 1.414-1.414L4.41 3.16zM12 18a7 7 0 0 1-7-7H3a9 9 0 0 0 8 8.94V21h2v-1.06a8.96 8.96 0 0 0 3.9-1.46l-1.43-1.43A6.95 6.95 0 0 1 12 18z"/>
  </svg>
)

export const ChatScreen: React.FC = () => {
  const [isListening, setIsListening] = useState(false)

  const ariaLabel = useMemo(
    () => (isListening ? '音声入力を停止' : '音声入力を開始'),
    [isListening]
  )

  const handleToggle = () => setIsListening((v) => !v)

  return (
    <>
      <Background />
      <main className={styles.main}>
        <div className={styles.inner}>
          <Panel size="large" aria-label="chat-screen" className={styles.panel}>
            <Text as="h2" variant="h2" color="brand" align="center">
              チャット
            </Text>

            <Text variant="body" color="primary" align="center">
              ここはチャット画面のプレースホルダーです。会話UIはここに実装されます。
            </Text>

            <div className={styles.actionsRow}>
              <IconButton
                type="button"
                aria-pressed={isListening}
                aria-label={ariaLabel}
                title={ariaLabel}
                sent={isListening}
                onClick={handleToggle}
              >
                {isListening ? (
                  <MicOffIcon title="マイクOFF" />
                ) : (
                  <MicIcon title="マイクON" />
                )}
              </IconButton>
            </div>

            {isListening && (
              <div className={styles.voiceStatus} aria-live="polite">
                <span className={styles.pulseDot} aria-hidden="true" />
                <Text as="span" variant="bodySmall" color="secondary">
                  音声入力中…
                </Text>
              </div>
            )}
          </Panel>
        </div>
      </main>
    </>
  )
}

export default ChatScreen