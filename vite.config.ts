import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa'

/** 遞迴收集 personal 資產的內容 md5（排除 dotfile / README） */
function collectPersonalHashes(dir: string): Set<string> {
  const out = new Set<string>()
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      for (const h of collectPersonalHashes(p)) out.add(h)
    } else if (!e.name.startsWith('.') && !e.name.endsWith('.md')) {
      out.add(crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'))
    }
  }
  return out
}

/** Release 守衛：剔除個人版資產（tree-shaking 管不到 emitFile 的實體檔） */
function releaseGatePersonalAssets(isRelease: boolean): Plugin {
  return {
    name: 'release-gate-personal-assets',
    apply: 'build',
    generateBundle(_options, bundle) {
      if (!isRelease) return
      const hashes = collectPersonalHashes(
        path.resolve('src/themes/personal/assets/kawaii-pastel'),
      )
      if (hashes.size === 0) return
      let removed = 0
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'asset') continue
        const buf = Buffer.from(output.source as string | Uint8Array)
        if (hashes.has(crypto.createHash('md5').update(buf).digest('hex'))) {
          this.warn(`[release-gate] 剔除個人版資產：${fileName}`)
          delete bundle[fileName]
          removed++
        }
      }
      this.warn(`[release-gate] 共剔除 ${removed} 個個人版資產`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isRelease = env.VITE_RELEASE_MODE === 'production';
  return {
    build: {
      // production release 關閉 sourcemap，確保 personal 源碼（含 kawaii 字串）
      // 不會洩漏到 dist/，release 閘門 grep "kawaii" dist/ = 0。
      // dev／staging 仍保留 hidden sourcemap 除錯。
      sourcemap: isRelease ? false : 'hidden',
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
        'icons/vivix-icon-light-512-maskable.png',
        'icons/vivix-icon-dark-192.png',
        'icons/vivix-icon-dark-512.png',
        'icons/vivix-icon-dark-180.png',
        'icons/vivix-icon-dark-32.png',
        'icons/vivix-icon-dark-512-maskable.png',
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
      releaseGatePersonalAssets(isRelease),
  ],
  }
})
