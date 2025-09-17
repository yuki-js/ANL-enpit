import React from 'react'
import { Background } from '../ui/Background/Background'
import { Text } from '../ui/Text/Text'
import { Button } from '../ui/Button/Button'
import { Panel } from '../ui/Panel/Panel'
import styles from './HomeHeroScreen.module.css'

/**
 * HomeHeroScreen
 *
 * Updated: ダークでテック感のある配色へ変更、ページを縦にブロック分けして見やすく
 */

export const HomeHeroScreen: React.FC = () => {
  return (
    <>
      <Background />

      <main className={styles.main}>
        <div className={styles.inner}>
          {/* Hero */}
          <Panel size="large" aria-label="home-hero" className={styles.heroPanel}>
            <Text as="h1" variant="h1" color="brand" align="center">
              ANL — 音声で自然に書く、新しい文書作成
            </Text>
   
            <Text variant="bodyLarge" color="primary" align="center">
              手を使わずに思考をそのまま記録・編集できる大学生向けの文書編集アプリ。
              音声で下書きから直接編集まで行えるため、資料作成やレポート作成の流れが途切れません。
            </Text>
 
            <div className={styles.ctaRow}>
              <div className={styles.ctaGroup}>
                <Button variant="primary" size="large">
                  無料で始める
                </Button>
                <Button variant="secondary" size="large">
                  主な機能を見る
                </Button>
              </div>
            </div>
          </Panel>
 
          {/* Features: stacked vertical blocks */}
          <section aria-label="features" className={styles.features}>
            <Panel size="medium" className={styles.featureItem}>
              <Text as="h3" variant="h3" color="primary">
                思考のままに話すだけ
              </Text>
              <Text variant="body" color="secondary">
                キーボードから解放され、話すだけでメモや下書きを残せます。途中でアイデアが出たらそのまま追加。
              </Text>
            </Panel>
 
            <Panel size="medium" className={styles.featureItem}>
              <Text as="h3" variant="h3" color="primary">
                音声で直接編集
              </Text>
              <Text variant="body" color="secondary">
                Gemini などの生成ツールと違い、ANL
                はあなたの声で既存の文章を直接差し替え・修正できます。
              </Text>
            </Panel>
 
            <Panel size="medium" className={styles.featureItem}>
              <Text as="h3" variant="h3" color="primary">
                レポート作成がもっと速く
              </Text>
              <Text variant="body" color="secondary">
                参考資料や引用と組み合わせて、構成を整え、仕上げまでスムーズに仕上げられます。
              </Text>
            </Panel>
          </section>
        </div>
      </main>
    </>
  )
}

export default HomeHeroScreen
