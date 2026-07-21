# IRONPULSE — iPhone 安裝教學

完全免費、不用 App Store、不用 Expo Go，把 IRONPULSE 變成 iPhone 上的 App。

---

## 方案概覽

採用 **PWA(Progressive Web App)** 標準：
- 透過 Safari 加入主畫面，桌面出現 App 圖示
- 全螢幕啟動、無瀏覽器列
- 離線可用(Service Worker 快取所有資源)
- 永久免費、無 7 天過期限制
- 資料存在手機 LocalStorage，不會上傳

---

## 步驟一：部署到 Vercel(5 分鐘)

### 1. 推到 GitHub
```bash
# 在專案根目錄
git add -A
git commit -m "feat: PWA 改造完成"
git remote add origin https://github.com/<你的帳號>/ironpulse.git
git push -u origin main
```

### 2. 接入 Vercel
1. 註冊/登入 https://vercel.com (可用 GitHub 帳號)
2. 點 **Add New → Project**
3. 選擇你的 `ironpulse` repo
4. Vercel 會自動偵測 Vite 框架
5. 直接按 **Deploy**
6. 等 1-2 分鐘完成，會給你一個網址：
   ```
   https://ironpulse-xxxxx.vercel.app
   ```

### 3. 自訂網域(可選)
在 Vercel 專案 Settings → Domains 加入自己的網域。免費方案可用 `<name>.vercel.app`。

---

## 步驟二：iPhone 安裝(2 分鐘)

### 1. 用 Safari 打開網址
**必須用 Safari**，Chrome/Firefox 不支援「加入主畫面」。

打開部署好的網址，例如：
```
https://ironpulse-xxxxx.vercel.app
```

### 2. 加入主畫面
1. 點 Safari 底部的 **分享圖示**（方形＋向上箭頭）
2. 滑動清單，找到 **「加入主畫面」**（Add to Home Screen）
3. 改名為 `IRONPULSE`（或保持預設）
4. 點 **新增**

### 3. 啟動 App
桌面會出現一個黑色圖示、寫著 `IRONPULSE` 的 App：
- 點擊啟動 → 全螢幕開啟，無 Safari 地址列
- 啟動畫面為黑底
- 跟原生 App 體驗完全一致

---

## 步驟三：離線使用

第一次開啟後，Service Worker 會把所有 JS、CSS、字型、圖片快取起來：
- 之後**沒有網路也能用**
- 資料(訓練記錄、個人紀錄、設定)存在 LocalStorage
- 升級新版時會自動背景下載，下次開啟自動更新

---

## 疑難排解

### 圖示沒出現在桌面
- 確認是用 **Safari** 打開，不是 Chrome
- 確認點了「加入主畫面」而非「加入書籤」
- 檢查是否啟用了「螢幕使用時間」限制 App 安裝

### 開啟後是空白
- 等 10-30 秒讓 Service Worker 完成快取
- 第一次連線需要網路下載資源
- 關掉重開一次

### 圖示顯示為 Safari 預覽
- iOS 會在 App 名稱下方顯示「Safari」小字
- 這是正常現象，點開後仍是全螢幕 App 體驗
- 若要完全消除，需走 Sideloadly 側載(但有 7 天限制)

### 升級後沒看到新功能
- 等 30 秒讓背景自動更新
- 或長按 App 圖示 → 刪除 → 重新加入主畫面

---

## 與原生 App 差異

| 功能 | PWA | 原生 App |
|---|---|---|
| 啟動方式 | 桌面圖示 | 桌面圖示 |
| 全螢幕 | ✅ | ✅ |
| 離線使用 | ✅ | ✅ |
| 推播通知 | ❌(需 iOS 16.4+) | ✅ |
| Haptics 震動 | ❌(改用音效+視覺) | ✅ |
| 7 天過期 | ❌ 永久 | 視簽章而定 |
| 上 App Store | ❌ | ✅ |
| 費用 | 免費 | $99/年 |

---

## 移除

長按桌面 App 圖示 → 移除 App → 點「刪除 App」。
Local Storage 資料會一併清除。
