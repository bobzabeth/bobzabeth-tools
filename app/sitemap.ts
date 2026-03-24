import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bobzabeth-tools.com'
  const lastModified = new Date()

  // 固定のページリスト
  const staticRoutes = [
    '',           // ホーム画面
    '/privacy',   // プライバシーポリシー
    '/contact',   // お問い合わせ
    '/keigo',     // イイ感じ敬語くん
  ]

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))
}