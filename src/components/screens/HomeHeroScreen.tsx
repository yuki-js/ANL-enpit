import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import styles from './HomeHeroScreen.module.css'
import { Background } from '../ui/Background/Background'
import { Text } from '../ui/Text/Text'
import { Button } from '../ui/Button/Button'

/**
 * HomeHeroScreen
 *
 * Updated: ダークでテック感のある配色へ変更、ページを縦にブロック分けして見やすく
 */

export const HomeHeroScreen: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className={styles.root}>
      <div className={styles.backgroundLayer}>
        <Background />
      </div>

      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero} aria-label="home-hero">
          <div className={styles.content}>
            <Text as="h1" variant="h1" color="brand" className={styles.title}>
              ANL — 音声で自然に書く、新しい文書作成
            </Text>

            <Text variant="bodyLarge" color="primary" className={styles.lead}>
              手を使わずに思考をそのまま記録・編集できる大学生向けの文書編集アプリ。
              音声で下書きから直接編集まで行えるため、資料作成やレポート作成の流れが途切れません。
            </Text>

            <div className={styles.ctaRow}>
              <Button variant="primary" size="large" className={styles.cta}>
                無料で始める
              </Button>
              <Button
                variant="secondary"
                size="large"
                className={styles.secondary}
                onClick={() => navigate({ to: '/showcase' as any })}
              >
                主な機能を見る
              </Button>
            </div>
          </div>
        </section>

        {/* Features: stacked vertical blocks */}
        <section className={styles.blocks} aria-label="features">
          <div className={styles.block}>
            <Text as="h3" variant="h3" color="primary" className={styles.blockTitle}>
              思考のままに話すだけ
            </Text>
            <Text variant="body" color="secondary" className={styles.blockDesc}>
              キーボードから解放され、話すだけでメモや下書きを残せます。途中でアイデアが出たらそのまま追加。
            </Text>
          </div>

          <div className={styles.block}>
            <Text as="h3" variant="h3" color="primary" className={styles.blockTitle}>
              音声で直接編集
            </Text>
            <Text variant="body" color="secondary" className={styles.blockDesc}>
              Gemini などの生成ツールと違い、ANL はあなたの声で既存の文章を直接差し替え・修正できます。
            </Text>
          </div>

          <div className={styles.block}>
            <Text as="h3" variant="h3" color="primary" className={styles.blockTitle}>
              レポート作成がもっと速く
            </Text>
            <Text variant="body" color="secondary" className={styles.blockDesc}>
              参考資料や引用と組み合わせて、構成を整え、仕上げまでスムーズに仕上げられます。
            </Text>
          </div>
        </section>
      </main>
    </div>
  )
}

export default HomeHeroScreen