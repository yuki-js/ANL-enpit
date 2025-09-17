import React from 'react'
import { Background } from '../ui/Background/Background'
import { Panel } from '../ui/Panel/Panel'
import { Carousel } from '../ui/Carousel/Carousel'
import { Text } from '../ui/Text/Text'
import styles from './ShowcaseScreen.module.css'

export function ShowcaseScreen() {
  return (
    <div className={styles.root}>
      <Background />

      {/* Showcase Header */}
      <Panel size="large" className={styles.headerPanel}>
        <Text
          as="h1"
          variant="h1"
          color="primary"
          effect="embossedStrong"
          align="center"
        >
          ₿ Ceremony UI Showcase
        </Text>
        <Text
          variant="bodyLarge"
          color="secondary"
          align="center"
          style={{ marginTop: '1rem' }}
        >
          Explore the best of our UI: animated backgrounds, carousel features,
          and beautiful typography.
        </Text>
      </Panel>

      {/* Carousel Showcase */}
      <Panel size="medium" className={styles.carouselPanel}>
        <Text
          as="h2"
          variant="h2"
          color="brand"
          align="center"
          effect="glowing"
          style={{ marginBottom: '1rem' }}
        >
          Ceremony Features
        </Text>
        <Carousel
          autoPlay
          autoPlayInterval={5000}
          pauseOnInteraction={10000}
          showIndicators
          showArrows
          size="medium"
        >
          <Carousel.Template icon="🔒" title="世界最高の安全性">
            <Text variant="body" color="secondary" align="center">
              ブロックチェーンで永久保存・改ざん不可能
            </Text>
          </Carousel.Template>
          <Carousel.Template icon="🌍" title="世界中から検証可能">
            <Text variant="body" color="secondary" align="center">
              いつでもどこからでも記録の真正性を確認
            </Text>
          </Carousel.Template>
          <Carousel.Template icon="💕" title="感情の共有">
            <Text variant="body" color="secondary" align="center">
              リアクション絵文字で喜びの瞬間を共有
            </Text>
          </Carousel.Template>
        </Carousel>
      </Panel>

      {/* Typography Showcase */}
      <Panel size="medium" className={styles.typographyPanel}>
        <Text
          as="h2"
          variant="h2"
          color="accent"
          align="center"
          style={{ marginBottom: '1rem' }}
        >
          Typography Examples
        </Text>
        <div className={styles.typographyExamples}>
          <Text as="h3" variant="h3" color="primary" weight="bold">
            Heading 3 - Ceremony Title
          </Text>
          <Text variant="bodyLarge" color="secondary">
            Body Large - This is an introductory paragraph for the showcase.
          </Text>
          <Text variant="body" color="brand" effect="glowing">
            Brand color glowing effect for Bitcoin ceremonies.
          </Text>
          <Text variant="caption" color="tertiary">
            Caption - Fine print and metadata.
          </Text>
          <Text as="code" variant="mono" color="info" truncate>
            0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
          </Text>
        </div>
      </Panel>
    </div>
  )
}
