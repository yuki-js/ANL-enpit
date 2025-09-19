import React, { useMemo, useState } from 'react'
import Panel from '../ui/Panel/Panel'
import { Text } from '../ui/Text/Text'
import { Input } from '../ui/Input/Input'
import { Button } from '../ui/Button/Button'
import AzureOpenAIConfig from '../../lib/azureOpenAIConfig'

type Status =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'info'; message: string }

const SettingsScreen: React.FC = () => {
  const cfg = useMemo(() => new AzureOpenAIConfig(), [])
  const initialUrl = cfg.buildRealtimeUrl() ?? ''
  const initialApiKey = cfg.apiKey ?? ''
  const [realtimeUrl, setRealtimeUrl] = useState(initialUrl)
  const [apiKey, setApiKey] = useState<string>(initialApiKey)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const snapshot = cfg.snapshot(false)
  const lastValidatedAt = snapshot.lastValidatedAt
  const maskedKey = snapshot.apiKey // masked when present

  const setError = (message: string) => setStatus({ kind: 'error', message })
  const setSuccess = (message: string) => setStatus({ kind: 'success', message })
  const setInfo = (message: string) => setStatus({ kind: 'info', message })

  const handleSave = () => {
    setSaving(true)
    try {
      if (!realtimeUrl) {
        setError('Realtime URLを入力してください')
        return
      }
      const ok = cfg.setFromRealtimeUrl(realtimeUrl)
      if (!ok) {
        setError('Realtime URLの形式が正しくありません。例: https://{resource}.openai.azure.com/openai/realtime?api-version=YYYY-MM-DD-preview&deployment=...')
        return
      }
      if (!apiKey) {
        setError('APIキーを入力してください')
        return
      }
      cfg.apiKey = apiKey

      const v = cfg.validateAll()
      if (!v.ok) {
        setError(`バリデーション失敗: ${v.errors.join(', ')}`)
        return
      }
      setSuccess('設定を保存しました。')
    } catch (e: any) {
      setError(`保存に失敗しました: ${String(e?.message ?? e)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setInfo('接続テスト中...')
    try {
      if (!realtimeUrl) {
        setError('Realtime URLを入力してください')
        return
      }
      if (!apiKey) {
        setError('APIキーを入力してください')
        return
      }
      // 成功時のみ保存
      const res = await cfg.testConnectionWith(realtimeUrl, apiKey, 7000, true)
      if (res.ok) {
        setSuccess('接続テスト成功。設定を保存しました。')
      } else {
        setError(`接続テスト失敗${res.status ? ` (コード ${res.status})` : ''}${res.error ? `: ${res.error}` : ''}`)
      }
    } catch (e: any) {
      setError(`接続テスト失敗: ${String(e?.message ?? e)}`)
    } finally {
      setTesting(false)
    }
  }

  const handleClear = () => {
    cfg.clear()
    setRealtimeUrl('')
    setApiKey('')
    setStatus({ kind: 'success', message: '保存済み設定をクリアしました。' })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
      <Text as="h2" variant="h2">設定</Text>
      <Panel className="">
        <div style={{ display: 'grid', gap: 16, padding: 16 }}>
          <div>
            <Text as="label" variant="label">Azure OpenAI Realtime URL</Text>
            <Input
              placeholder="https://<resource>.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment=gpt-realtime"
              value={realtimeUrl}
              onChange={(e) => setRealtimeUrl(e.target.value)}
              autoComplete="off"
            />
            <Text variant="caption" color="tertiary">
              例: https://your-resource.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment=gpt-realtime
            </Text>
          </div>

          <div>
            <Text as="label" variant="label">APIキー</Text>
            <Input
              type="password"
              placeholder="APIキーを入力"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            {/* マスク済みAPIキー表示は不要のため削除 */}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={handleSave} loading={saving}>保存</Button>
            <Button variant="secondary" onClick={handleTest} loading={testing}>接続テスト</Button>
            <Button variant="secondary" onClick={handleClear}>クリア</Button>
          </div>

          {status.kind !== 'idle' ? (
            <div role="status">
              <Text variant="body" color={
                status.kind === 'success' ? 'success' : status.kind === 'error' ? 'error' : 'info'
              }>
                {status.message}
              </Text>
            </div>
          ) : null}

          {lastValidatedAt ? (
            <Text variant="caption" color="tertiary">
              最終接続確認日時: {new Date(lastValidatedAt).toLocaleString()}
            </Text>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}

export default SettingsScreen