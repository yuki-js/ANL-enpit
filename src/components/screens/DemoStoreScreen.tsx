import React from 'react'
import { useStore } from '@tanstack/react-store'
import { fullName, store } from '../../lib/demo-store'
import styles from './DemoStoreScreen.module.css'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { Input } from '../ui/Input/Input'
import { Background } from '../ui/Background/Background'

/**
 * DemoStoreScreen
 *
 * 変更点:
 * - ページを開くとすぐに中央に「Hello World」がきらびやかに表示されるヒーロー表示を追加
 * - 既存のストアフォームは下部に残し、ページ読み込み時にヒーローが短時間でフェードアウトしてフォームが見えるようになる
 *
 * 実装方針:
 * - Background コンポーネントを利用して豪華な背景を維持
 * - ローカル state でヒーローの表示/非表示を管理（UIロジックのみ）
 */

export function DemoStoreScreen() {
  const firstName = useStore(store, (state) => state.firstName)
  const lastName = useStore(store, (state) => state.lastName)
  const fName = useStore(fullName)

  // ヒーロー表示の制御（ページ表示後、自動でフェードアウト）
  const [showHero, setShowHero] = React.useState(true)
  React.useEffect(() => {
    const t = setTimeout(() => setShowHero(false), 2200) // 2.2s でフェードアウト
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={styles.root}>
      {/* 豪華な背景 */}
      <Background />

      {/* ヒーロー */}
      <div className={`${styles.hero} ${showHero ? styles.heroVisible : styles.heroHidden}`} aria-hidden={!showHero}>
        <div className={styles.sparkles} />
        <Text as="h1" variant="h1" color="brand" align="center" className={styles.helloText}>
          Hello World
        </Text>
        <Text variant="body" color="secondary" align="center" className={styles.subText}>
          ようこそ — このページはきらびやかです ✨
        </Text>
      </div>

      {/* 既存コンテンツ */}
      <div className={styles.container} aria-hidden={showHero}>
        <Panel size="large">
          <div className={styles.header}>
            <Text as="h1" variant="h1" color="primary" align="center">
              Store Example
            </Text>
            <Text variant="body" color="secondary" align="center" style={{ marginTop: '0.5rem' }}>
              Enter your name to see reactive state management in action
            </Text>
          </div>

          <div className={styles.formSection}>
            <div className={styles.inputGroup}>
              <Text as="label" variant="label" color="primary">
                First Name
              </Text>
              <Input
                type="text"
                value={firstName}
                onChange={(e) =>
                  store.setState((state) => ({ ...state, firstName: e.target.value }))
                }
                variant="primary"
                placeholder="Enter your first name"
                size="medium"
              />
            </div>

            <div className={styles.inputGroup}>
              <Text as="label" variant="label" color="primary">
                Last Name
              </Text>
              <Input
                type="text"
                value={lastName}
                onChange={(e) =>
                  store.setState((state) => ({ ...state, lastName: e.target.value }))
                }
                variant="primary"
                placeholder="Enter your last name"
                size="medium"
              />
            </div>
          </div>

          <div className={styles.resultSection}>
            <div className={styles.resultContainer}>
              <Text variant="label" color="secondary" align="center" className={styles.resultLabel}>
                Full Name
              </Text>
              <div className={styles.resultValue}>
                {fName ? (
                  <Text variant="h3" color="primary" align="center">
                    {fName}
                  </Text>
                ) : (
                  <Text variant="body" color="tertiary" align="center" className={styles.emptyState}>
                    Your full name will appear here
                  </Text>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}