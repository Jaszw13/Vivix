import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vivix - 你的新手訓練夥伴',
        short_name: 'Vivix',
        description: 'Vivix - 給健身新手的陪伴型教練 App，完整力量訓練紀錄、進度追蹤與 Partner 陪伴系統。',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F8F5F0',
        theme_color: '#F8F5F0',
        lang: 'zh-Hant',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // ⚠️ 斬斷舊 SW precache 導致嘅 bundle 版本錯配：
        //   發佈新版本後，立即 skipWaiting + clientsClaim，唔會因為用戶未關閉晒所有 tab 就拖住唔更新。
        //   之前 onboarding finish() 撞舊 bundle → setActivePlan 未定義 throw 就係因為 SW 舊 cache。
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // 確保每次打開 app 都檢查一次更新，SPA navigate fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/__/, /\/api\//],
        // 預載 Google Fonts 樣式
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
