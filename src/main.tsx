import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 入口級最後防線：連 ErrorBoundary 都冇機會執行嘅級別錯誤（例如 bundle 加載失敗 /
 * React DOM 根本 mount 唔到 / minify invariant 導致 root 層 throw），
 * 都會顯示原生 DOM fallback，唔會完全白屏。
 */
function renderFallback(message: string, error?: unknown) {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;
  rootEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'min-h-screen w-full max-w-[480px] mx-auto flex items-stretch px-5 py-10';
  wrap.style.background = 'var(--bg-primary, #F8F5F0)';
  const errName = error instanceof Error ? `${error.name}: ${error.message}` : (error ? String(error) : '');
  wrap.innerHTML = `
    <div style="width:100%;border-radius:20px;border:1px solid rgba(234,88,12,0.25);background:var(--bg-card,#fff);padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.06);display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;border-radius:16px;background:rgba(234,88,12,0.15);color:var(--auxiliary,#D97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:20px;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-primary,#111);font-weight:700;">暫時無法開啟</div>
          <p style="font-size:11px;color:var(--text-secondary,#666);margin-top:4px;">${message}</p>
        </div>
      </div>
      ${errName ? `<div style="margin-top:16px;padding:12px;border-radius:12px;background:var(--bg-secondary,#F5F2EC);border:1px solid rgba(0,0,0,0.06);"><div style="font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text-secondary,#666);margin-bottom:4px;">錯誤摘要</div><pre style="font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--text-primary,#111);white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.5;">${errName}</pre></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;">
        <button onclick="location.reload()" style="height:48px;border:none;border-radius:12px;background:var(--accent,#B8895A);color:var(--bg-primary,#fff);font-size:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;">重新載入</button>
        <button onclick="(function(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.startsWith('ironpulse-'))localStorage.removeItem(k);}if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}location.reload();}catch(e){location.reload();}})()" style="height:48px;border-radius:12px;border:2px solid var(--border,#E5DCCA);background:var(--bg-secondary,#F5F2EC);font-size:14px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-primary,#111);cursor:pointer;">重置所有資料</button>
      </div>
      <p style="margin-top:16px;text-align:center;font-size:10px;color:color-mix(in srgb, var(--text-secondary,#666) 60%, transparent);line-height:1.6;">如果重新載入後仍然出現，請截圖回饋俾開發團隊。</p>
    </div>
  `;
}

let root: Root | null = null;
try {
  const el = document.getElementById('root');
  if (!el) {
    renderFallback('找不到掛載節點 #root，請檢查 HTML 結構。');
  } else {
    root = createRoot(el);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[Vivix] mount error:', err);
  try {
    if (root) (root as Root).unmount();
  } catch {}
  renderFallback('Vivix 啟動時遇到未預期錯誤，請按下面按鈕重試。', err);
}

// Global 級別：接住 Promise reject 同未 catch error，避免 iOS 因為 uncaught throw 白屏
if (typeof window !== 'undefined') {
  window.addEventListener('error', (evt) => {
    if (!evt || evt.defaultPrevented) return;
    const existing = document.getElementById('vivix-global-error');
    if (existing) return;
    // eslint-disable-next-line no-console
    console.error('[Vivix] global error:', evt.error || evt.message);
    // 如果連 React fallback 都冇，就顯示原生 DOM fallback（避免完全空白）
    if (document.getElementById('root')?.children.length === 0) {
      renderFallback('畫面發生未預期錯誤，請按下面按鈕重試。', evt.error || evt.message);
    }
  });
  window.addEventListener('unhandledrejection', (evt) => {
    // eslint-disable-next-line no-console
    console.error('[Vivix] unhandled promise rejection:', evt.reason);
    // promise 錯誤通常唔會導致白屏，淨係 log 唔做 UI 干擾
  });
}
