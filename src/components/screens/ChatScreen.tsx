import React from 'react'
import { Background } from '../ui/Background/Background'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import styles from './ChatScreen.module.css'

/**
 * ChatScreen
 *
 * プレースホルダーのチャット画面。実際のチャット機能は別途実装してください。
 */
export const ChatScreen: React.FC = () => {
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
          </Panel>
        </div>
      </main>
    </>
  )
}

export default ChatScreen