import React, { useState, useRef, useLayoutEffect } from 'react'
import { Streamdown } from 'streamdown'
import { Panel } from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import styles from './MarkdownDebugScreen.module.css'

/**
 * MarkdownDebugScreen
 *
 * - ページ名: markdownDebug (route defined in src/routes/markdownDebug.tsx)
 * - 目的: Streamdown を使ってAI風にストリーミングで来る Markdown テキストを
 *   ブロック境界を壊さずに逐次レンダリングするデバッグ画面。
 *
 * 実装方針:
 * - ローカルステートでメッセージの「パーツ」を保持し、Streamdown に渡す。
 * - 「送信」ボタンで入力された Markdown を小さなチャンクに分割して擬似ストリーミング配信する
 *   （実運用では OpenAI 等のストリーミングレスポンスの各チャンクを受け取り、同様に append する）。
 *
 * 注意:
 * - このコンポーネントはロジック実装に専念し、UI は最小限です。
 * - Streamdown は既に package.json に追加しています。ローカルで動かす場合は依存をインストールしてください（npm i / pnpm install）。
 */

type MessagePart = {
  id: string
  text: string // Markdown テキスト断片（ストリーミングで受信される想定）
}

export default function MarkdownDebugScreen(): React.ReactElement {
  const [input, setInput] = useState<string>(`# アジャイル開発に関するレポート

アジャイル開発は、変化の激しい現代のソフトウェア開発に適した軽量な開発手法です。本レポートでは、アジャイルの基本概念、主要な実践（スクラムやカンバン）、チーム運営、計画と見積もり、継続的改善の仕組み、そして現場でよく直面する課題とその対策について整理します。

## 1. アジャイルの基本原則

- 顧客満足を最優先し、早く継続的な価値提供を行うこと
- 変更を歓迎する（開発プロセスや要件の変化を受け入れる）
- 頻繁に動くソフトウェアを提供する（短いイテレーション）
- ビジネス側と開発側が日々協力する
- 自律的でクロスファンクショナルなチームを重視する

## 2. 代表的なフレームワーク

### スクラム（Scrum）
- スプリント（通常2〜4週間）で反復的に成果物を作る
- 主要なイベント：スプリントプランニング、デイリースクラム、スプリントレビュー、スプリントレトロスペクティブ
- 明確な役割：プロダクトオーナー、スクラムマスター、開発チーム

### カンバン（Kanban）
- 作業の流れを可視化し、WIP（進行中作業）を制限してフローを最適化する
- 継続的デリバリに向く柔軟な運用が可能

## 3. 計画と見積もり

- ストーリーポイントや相対見積もりを用いて相対的な大きさを評価する
- ベロシティ（過去のスプリントでの実績）を活用して現実的な計画を立てる
- リリース計画はあくまで仮説として扱い、定期的に見直す

## 4. 継続的インテグレーションとデプロイ

- 自動テスト、CI パイプライン、環境としてのインフラ自動化（IaC）を整備することが重要
- 小さな変更を頻繁にデプロイすることでリスクを低減し、ユーザーフィードバックを早期に得る

## 5. チーム運営とコミュニケーション

- 日次の短いミーティングで進捗を共有し、障害を早期に発見する
- レトロスペクティブを通じてプロセス改善を習慣化する
- ドメイン知識の共有（ペアプログラミング、コードレビュー、ドキュメント化）

## 6. よくある課題と対策

- 要件の頻繁な変更 → 受け入れ基準の明確化と短いフィードバックループで対応
- レガシーコードへの対応 → リファクタリングを計画的に組み込み、テストカバレッジを確保
- チームのバスファクター（特定メンバー依存） → ナレッジ共有とドキュメント、ローテーションで軽減
- 見積もりのばらつき → 相対見積もりと実績に基づく調整を行う

## 7. まとめと推奨アクション

アジャイルは「やり方」よりも「考え方」が重要です。まずは小さく始め、短いサイクルで動かして学びを得ること、そして継続的改善を文化として根付かせることが成功の鍵になります。初期フェーズでは以下を推奨します：

- 2週間スプリントを試し、レビューとレトロスペクティブを厳守する
- CI を整備してデプロイ頻度を上げる
- 定期的に技術的負債の返済（リファクタリング）をスプリントに組み込む

## 参考（抜粋）
- Agile Manifesto（アジャイル宣言）: https://agilemanifesto.org/
- Scrum Guide（スクラムガイド）: https://scrumguides.org/
`)
  const [parts, setParts] = useState<MessagePart[]>([])
  const runningRef = useRef<boolean>(false)

  // 単純な ID 生成
  const genId = () =>
    `mp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 入力された markdown を擬似ストリーミングでパーツに分割して追加する
  // 実際はサーバから来る逐次チャンクを部分的に append する形になる
  const simulateStreaming = async (text: string) => {
    if (runningRef.current) return
    runningRef.current = true
    setParts([])

    // 分割ロジック: 行単位＋長い行はさらに短く切る
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      if (!runningRef.current) break
      // 1行をさらに適度な長さのチャンクに分割
      const chunkSize = 80
      for (let i = 0; i < line.length; i += chunkSize) {
        if (!runningRef.current) break
        const slice = line.slice(i, i + chunkSize)
        const newPart: MessagePart = {
          id: genId(),
          text: slice + (i + chunkSize >= line.length ? '\n' : ''),
        }
        // 部分を逐次追加（Streamdown により不完全な Markdown でも安全にレンダリング）
        setParts((p) => [...p, newPart])
        // 表示のストリーム感を出すために少し待機
        // 実運用ではチャンク到着のイベントごとに追加する
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 120))
      }
      // 行間の待機でブロック境界が来たことを表現
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 80))
    }

    runningRef.current = false
  }

  React.useLayoutEffect(() => {
    // StrictMode対策: useLayoutEffectはStrictModeでも1回だけ実行される
    // ページ表示時に自動でストリーミングを開始する（ボタン等は不要）
    // simulateStreaming は input の現在値を逐次 parts に流す
    // マウント時に自動起動
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      await simulateStreaming(input)
    })()

    // アンマウント時はストリーミングを停止
    return () => {
      runningRef.current = false
    }
  }, []) // 初回マウント時のみ

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <Panel size="large" className={styles.panel}>
          <Text as="h2" variant="h2" color="brand" style={{ marginBottom: 12 }}>
            Markdown Document (Streamdown)
          </Text>

          {/* 入力・操作用の UI は削除し、自動ストリームの表示だけにする */}

          <div className={styles.streamContainer}>
            {parts.length === 0 ? (
              <Text variant="caption" color="tertiary">
                Streaming document...
              </Text>
            ) : (
              parts.map((part) => (
                <div key={part.id} className={styles.chunk}>
                  <Streamdown>{part.text}</Streamdown>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
