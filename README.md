# ANL
## メンバーのアカウントリンク
青木ゆうき https://github.com/yuki-js
<br>
森本悠仁(muzui) https://github.com/Ujiuzui
<br>
松浦 https://github.com/Benjamin468

## エレベーターピッチ
手を使わずに楽に文書作成したい大学生向けの、ANLというプロダクトは文書編集アプリです。
これは音声入力で思考整理や文書作成ができ、Geminiとは違って、音声で直接文書を編集する機能が備わっています。

## Azure OpenAI 設定画面・APIキー取得マニュアル（プログラマ向け）

### 画面の使い方
1. `/settings` 画面にアクセスします。
2. 「Azure OpenAI Realtime URL」欄に、Azureポータルで発行された Realtime API のURLを貼り付けます。
   - 例: `https://your-resource.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment=gpt-realtime`
3. 「APIキー」欄に、Azure OpenAI の管理画面で取得したAPIキーを入力します。
4. 「保存」ボタンを押すと、URL・APIキーがローカルストレージに保存されます。
5. 「接続テスト」ボタンで、WebSocketハンドシェイクによる疎通確認ができます。成功時は設定も保存されます。
6. 「クリア」ボタンで保存済み設定を全消去できます。

### APIキーのプログラムからの取得方法

設定画面で保存したAPIキーは、`AzureOpenAIConfig` クラスを使って取得できます。

#### 例: APIキーの取得

```typescript
import AzureOpenAIConfig from './src/lib/azureOpenAIConfig'

// インスタンス生成（localStorageから自動ロード）
const cfg = new AzureOpenAIConfig()

// APIキー取得
const apiKey = cfg.apiKey // string | undefined

// Realtime URL取得
const realtimeUrl = cfg.buildRealtimeUrl() // string | null

// WebSocket用URL（api-keyクエリ付き）取得
const wsUrl = cfg.buildRealtimeWebSocketUrl(true) // string | null
```

#### 注意点
- APIキーはローカルストレージに平文保存されます。セキュリティ要件に応じてバックエンドVault等の利用を推奨します。
- 画面リロード時もAPIキーは自動でインプット欄に反映されます。
- クリア操作で完全消去されます。

#### 設定値のバリデーション
```typescript
const result = cfg.validateAll()
if (!result.ok) {
  // result.errors: string[] に理由が入る
}
```

#### 疎通確認（WebSocketハンドシェイク）
```typescript
const res = await cfg.testConnectionWith(realtimeUrl, apiKey, 7000, true)
if (res.ok) {
  // 接続成功
} else {
  // res.error で失敗理由確認
}
```

### よくある質問
- **APIキーが消える場合**: 画面リロード時にインプット欄へ自動反映されます。クリア操作時のみ消去されます。
- **マスク表示**: 現在はインプット欄のみで管理し、マスク表示はありません。

---