import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | ボブザベスの「これ便利じゃね？」",
  description: "ボブザベスの「これ便利じゃね？」のプライバシーポリシーページです。",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FFFBF5] font-sans text-slate-800">
      <div className="max-w-2xl mx-auto px-4 py-16">

        {/* 戻るリンク */}
        <a href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-10">
          ← トップへ戻る
        </a>

        <h1 className="text-3xl font-black mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-slate-400 mb-10">最終更新日：2026年3月</p>

        <div className="space-y-10 text-sm leading-relaxed text-slate-600">

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">1. はじめに</h2>
            <p>
              ボブザベスの「これ便利じゃね？」（以下「当サイト」）は、bobzabethが運営する無料AIツール集です。
              本プライバシーポリシーでは、当サイトにおける個人情報・データの取り扱いについて説明します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">2. 収集する情報</h2>
            <p className="mb-3">当サイトでは以下の情報を収集することがあります。</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>アクセスログ（IPアドレス、ブラウザ情報、参照元URLなど）</li>
              <li>ツール利用時に入力されたテキスト（AIによる処理のためのみ使用）</li>
              <li>Cookieおよびローカルストレージに保存される利用回数データ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">3. 情報の利用目的</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>AIツールの機能提供のため</li>
              <li>サイトの利用状況の分析・改善のため</li>
              <li>不正利用の防止のため</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">4. Google Analyticsについて</h2>
            <p className="mb-3">
              当サイトはアクセス解析のためにGoogle Analyticsを使用しています。
              Google Analyticsはアクセス情報の収集にCookieを使用しますが、個人を特定する情報は収集しません。
            </p>
            <p>
              収集されたデータはGoogleのプライバシーポリシーに基づいて管理されます。
              Google Analyticsのオプトアウトは
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline mx-1">
                こちら
              </a>
              から行えます。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">5. AIサービス（Gemini API）について</h2>
            <p>
              当サイトのAIツールはGoogle Gemini APIを使用しています。
              ユーザーが入力したテキストはAIによる処理のためにGoogleのサーバーに送信されます。
              入力内容はサイト運営者のサーバーに保存されません。
              詳細はGoogleのプライバシーポリシーをご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">6. Cookieについて</h2>
            <p>
              当サイトではツールの1日の利用回数管理のためにブラウザのローカルストレージを使用しています。
              ブラウザの設定によりCookieやローカルストレージを無効にすることができますが、
              一部機能が正常に動作しない場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">7. 第三者への情報提供</h2>
            <p>
              当サイトは、法令に基づく場合を除き、収集した情報を第三者に提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">8. プライバシーポリシーの変更</h2>
            <p>
              本ポリシーは必要に応じて変更することがあります。
              変更後はこのページに掲載し、最終更新日を更新します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">9. お問い合わせ</h2>
            <p>
              本ポリシーに関するご質問は、X（旧Twitter）の
              <a href="https://twitter.com/bobzabeth012" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline mx-1">
                @bobzabeth012
              </a>
              までDMにてお問い合わせください。
            </p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          © 2026 ボブザベスの「これ便利じゃね？」
        </div>
      </div>
    </main>
  );
}
