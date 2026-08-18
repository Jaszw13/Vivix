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
      // ⚠️ 雙主題 manifest 由 index.html inline script 動態載入（G-05）
      //   唔再由插件注入單一 manifest，light/dark 各有一份 webmanifest
      manifest: false,
      // 確保離線 precache 到雙主題所有 icon 資產與 webmanifest
      includeAssets: [
        'manifest-light.webmanifest',
        'manifest-dark.webmanifest',
        'icons/vivix-icon-light-192.png',
        'icons/vivix-icon-light-512.png',
        'icons/vivix-icon-light-180.png',
        'icons/vivix-icon-light-32.png',
        'icons/vivix-icon-dark-192.png',
        'icons/vivix-icon-dark-512.png',
        'icons/vivix-icon-dark-180.png',
        'icons/vivix-icon-dark-32.png',
      ],
      workbox: {
        // ⚠️ 斬斷舊 SW precache 導致嘅 bundle 版本錯配：
        //   發佈新版本後，立即 skipWaiting + clientsClaim，唔會因為用戶未關閉晒所有 tab 就拖住唔更新。
        //   之前 onboarding finish() 撞舊 bundle → setActivePlan 未定義 throw 就係因為 SW 舊 cache。
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,ttf,webmanifest}'],
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
