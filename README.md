# web-parser

Google AI Edge Gallery Agent Mode 向けのWebスキル集です。

## スキル一覧

| スキル | 説明 |
|--------|------|
| [web-search](web-search/) | Web検索と本文取得を1回の呼び出しで完結するスキル |

---

## web-search

[Jina.ai](https://jina.ai) のSearch API・Reader APIを使い、検索から本文取得までを1回の`run_js`呼び出しで完結します。

### 動作フロー

```
LLM が run_js("index.html", { query, max_results }) を呼ぶ
    ↓ JavaScript (LLM非介在)
[並列] s.jina.ai 検索  +  blocked-domains.json 取得
    ↓
除外ドメインでフィルタリング
    ↓
[並列] r.jina.ai で各URLの本文を取得
    ↓
リンク・箇条書き行を除去 → 2000字にスライス
    ↓
Markdown形式でLLMに返す
```

HTTP通信・フィルタリング・整形はすべてJavaScriptで機械処理されます。LLMが関与するのは「クエリの決定」と「結果の要約」のみです。

### セットアップ

#### 1. Jina.ai APIキーの取得

1. [jina.ai](https://jina.ai) でサインアップ
2. API Keys ページで無料キーを生成（無料枠: 10Mトークン）

#### 2. スキルのインポート

Google AI Edge Gallery の Agent Skills 画面で以下のURLを追加します。

```
https://sashisashi569.github.io/web-parser/web-search
```

#### 3. APIキーの設定

インポート後にスキル設定画面が表示されます。取得したJina.ai APIキーを入力してください。

### ファイル構成

```
web-search/
├── SKILL.md                # スキルのメタデータとLLMへの指示
├── blocked-domains.json    # 除外ドメインリスト（編集可）
├── emulate.mjs             # ローカルテスト用エミュレータ
└── scripts/
    └── index.html          # スキル本体（JavaScriptロジック）
```

### 設定の調整

#### 除外ドメインの追加

`web-search/blocked-domains.json` の `domains` 配列に追加します。`www.` は不要です。

```json
{
  "domains": [
    "youtube.com",
    "x.com",
    "your-problem-site.com"
  ]
}
```

ログイン必須・本文が取得できない・ノイズが多いサイトを追加してください。

#### コンテキスト量のチューニング

`web-search/scripts/index.html` の定数を変更します。

| 定数 | デフォルト | 説明 |
|------|-----------|------|
| `MAX_CONTENT_CHARS` | `2000` | 1サイトあたりの本文文字数上限 |
| `max_results` デフォルト | `1` | LLMが省略した場合のサイト取得数 |
| `max_results` 上限 | `2` | LLMが指定できる最大サイト取得数 |

変更後は `emulate.mjs` でLLMへ渡されるコンテキストを確認できます。

### ローカルエミュレーション

デバイスにデプロイせず、LLMへ渡される文字列を手元で確認できます。

```bash
cd web-search
JINA_API_KEY=jina_xxx node emulate.mjs "調べたいこと"
JINA_API_KEY=jina_xxx node emulate.mjs "Python 3.13 features" 2
```

Node.js v18以降が必要です。

出力例:

```
────────────────────────────────────────────────────────────
Query      : 最近のAIニュース
max_results: 1
API key    : jina_xxx…
────────────────────────────────────────────────────────────

[1/3] Searching s.jina.ai …
  → 1 result(s) after filtering

[2/3] Fetching page content via r.jina.ai …
  [1] OK — 1843 chars from reuters.com

[3/3] Result sent to LLM:
════════════════════════════════════════════════════════════
## [1] ...記事タイトル...
Source: https://...

...本文2000字以内...
════════════════════════════════════════════════════════════

Stats:
  Characters : 1893
  Token est. : ~2839
```

### エラー診断

スキルが失敗した場合、エラーメッセージの先頭コードで原因を特定できます。

| コード | 原因 | 対処 |
|--------|------|------|
| `[NETWORK_ERROR]` | ネットワーク到達不可またはCORSブロック | 接続を確認 |
| `[HTTP_401]` | APIキー未設定または無効 | Jina.aiキーを確認 |
| `[HTTP_429]` | レートリミット超過 | しばらく待って再試行 |
| `[PARSE_ERROR]` | レスポンスが予期しない形式 | Jina.ai APIの変更の可能性 |
| `[UNEXPECTED]` | その他の例外 | エラー詳細を確認 |

### 動作確認済み環境

- Google AI Edge Gallery (Agent Skills)
- Gemma-4-E2B-IT (on-device, 8GB / 12GB RAM)
- Android 16

## ライセンス

Apache License 2.0
