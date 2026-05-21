<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow

- 変更したら毎回プルリクを作る（feature ブランチに push → `gh`/MCP で PR を立てる）。bobzabeth がローカルでプルして検証する流れ。
- 検証時にデバッグしやすいよう、API ルートには十分な `console.log` / `console.error` を残し、エラーレスポンスには本番以外で `stack` や `where` 情報を含める。
