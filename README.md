# 🌳 小小書房｜故事森林

親子共讀紀錄網站。每一本故事都是一片葉子，每個月長成一棵樹，一年過去，就擁有一座自己的閱讀森林。

這份程式碼免費分享。**每個家庭架設自己的一份**，資料存在你自己的免費雲端資料庫，不會和其他家庭共用，也不佔手機空間。夫妻可以用邀請碼一起記錄。

全程在網頁上操作，不用寫程式，大約 20 分鐘。

---

## 你需要準備

- 一個 **GitHub** 帳號（github.com，免費）
- 一個 **Netlify** 帳號（netlify.com，可用 GitHub 登入）
- 一個 **Supabase** 帳號（supabase.com，可用 GitHub 登入）

三個都有免費方案，一個家庭使用綽綽有餘。

---

## 步驟 1｜建立資料庫（Supabase）

1. 登入 **supabase.com** → **New project**
   - Name：`story-forest`
   - Database Password：按 **Generate**，另外存好
   - Region：**Northeast Asia (Tokyo)**
   - 方案：**Free**
2. 等 1～2 分鐘，專案建好。
3. 左側 **SQL Editor** → **New query**。
4. 打開這個倉庫裡的 [`supabase/schema.sql`](supabase/schema.sql)，按右上角複製按鈕，**整份貼上**，按 **Run**。
   看到 `Success` 就完成了。
5. 左側 **Authentication** → **Sign In / Providers** → **Email**：
   - 把 **Confirm email** 關掉，按 **Save**（自己家使用不需要 Email 驗證，也避免免費寄信次數不夠）
6. 左側 **Project Settings**（齒輪）→ **API Keys**，先把這兩個值複製到記事本：
   - **Project URL**（`https://xxxx.supabase.co`，在 **Data API** 頁也找得到）
   - **Publishable key**（`sb_publishable_` 開頭），或舊版的 **anon public** key

> ⚠️ 不要複製 **secret** 或 **service_role** key，那是最高權限的鑰匙，絕對不能放進網站。

## 步驟 2｜一鍵部署網站（Netlify）

點這個按鈕：

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_GITHUB_NAME/story-forest)

1. 用 GitHub 登入 Netlify，並允許它在你的 GitHub 建立一份副本。
2. 頁面會請你填兩個欄位：
   - `VITE_SUPABASE_URL`：貼上 **Project URL**
   - `VITE_SUPABASE_ANON_KEY`：貼上 **Publishable key**
3. 按 **Save & Deploy**，等 1～2 分鐘。
4. 完成後會得到你的網址，例如 `https://story-forest-abc123.netlify.app`。
   想改好記一點：**Site configuration → Change site name**。

## 步驟 3｜把網址告訴 Supabase

回到 Supabase → **Authentication** → **URL Configuration**：

- **Site URL**：貼上你的 Netlify 網址
- **Redirect URLs**：按 **Add URL**，貼上 `你的網址/**`

這樣「忘記密碼」的信才能正確回到你的網站。

## 步驟 4｜開始使用 🎉

1. 用手機打開你的網址 → **註冊新帳號**
2. **建立我的家庭** → 新增孩子（暱稱＋出生年月）
3. 想和另一半一起記錄：**設定 → 產生邀請碼**，傳給對方。對方打開同一個網址註冊，選 **我有邀請碼**。

建議把網址加到手機主畫面，之後像 App 一樣打開。

---

## 常見問題

**網站顯示「連不上資料庫」？**
Supabase 免費專案超過一週沒使用會自動暫停。登入 supabase.com，打開專案，按 **Restore project**，等幾分鐘就恢復，資料不會遺失。

**網站顯示「還沒連接資料庫」？**
部署時兩個欄位沒填好。到 Netlify：**Site configuration → Environment variables** 補上，再到 **Deploys → Trigger deploy → Deploy site**。

**資料安全嗎？**
資料存在你自己的 Supabase 專案，只有你和你邀請的家長能看到。孩子只需要暱稱，不用真實姓名。設定裡可以隨時匯出全部紀錄，或永久刪除帳號。

**會不會要付錢？**
一般家庭使用不會超過免費額度。只有在你主動升級方案時才會付費。各服務的免費條款可能調整，請以官網為準。

**原作者推出新版本，我要怎麼更新？**
一鍵部署建立的是你自己的獨立副本，不會自動跟著更新，所以你的網站不會突然改變。有新版本時，原作者會附上更新步驟。

---

## 目前進度

- ✅ 第一階段：手機版互動原型
- ✅ 第二階段：登入、家庭與孩子資料、邀請另一位家長、匯出與刪除
- ⏳ 第三階段：ISBN 掃描、書籍查詢、分類建議
- ⏳ 第四階段：閱讀樹與月曆連動真實紀錄
- ⏳ 第五階段：孩子互動模式、每月報告、年度森林
