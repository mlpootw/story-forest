# 🌳 小小書房｜故事森林

親子共讀紀錄網站。每一本故事都是一片葉子，每個月長成一棵樹，一年過去，就擁有一座自己的閱讀森林。

- 📷 掃描繪本 ISBN、搜尋書名，或自己拍封面新增
- 🌱 每個月和孩子選一棵樹：芭樂、芒果、柚子、蓮霧、山櫻花、香蕉
- 🍃 讀一本新書長一片葉子，葉子顏色代表八種繪本類型
- 🍈 孩子「好喜歡」或重讀的書，會在樹上結出果實
- 🦋 依台灣真實季節出現當月的花和小動物
- 📅 閱讀月曆、繪本書房，夫妻可以用邀請碼一起記錄

這份程式碼免費分享。**每個家庭架設自己的一份**，資料存在你自己的免費雲端資料庫，不和其他家庭共用，也不佔手機空間。

全程在網頁上操作，不用寫程式，大約 30 分鐘。

---

## 你需要準備

- **GitHub** 帳號（github.com）
- **Supabase** 帳號（supabase.com，可用 GitHub 登入）
- **Cloudflare** 帳號（dash.cloudflare.com）

三個都有免費方案，不用綁信用卡，一個家庭使用綽綽有餘。

---

## 步驟 1｜複製一份程式碼到你的 GitHub

1. 登入 GitHub，在這個頁面右上角按 **Fork** → **Create fork**。
2. 你的 GitHub 會多一個 `story-forest` 倉庫。

## 步驟 2｜建立資料庫（Supabase）

1. 登入 **supabase.com** → **New project**
   - Name：`story-forest`
   - Database Password：按 **Generate**，另外存好
   - Region：**Northeast Asia (Tokyo)**
2. 等 1～2 分鐘，專案建好。
3. 左側 **SQL Editor** → **New query**。
4. 打開這個倉庫裡的 [`supabase/schema.sql`](supabase/schema.sql)，按右上角複製按鈕，**整份貼上**，按 **Run**，看到 `Success` 就完成。
5. 左側 **Authentication** → **Sign In / Providers**：把 **Confirm email** 關掉 → **Save changes**。
6. 左側 **Project Settings**（齒輪）→ **API Keys**，複製這兩個值到記事本：
   - **Project URL**（`https://xxxx.supabase.co`）
   - **Publishable key**（`sb_publishable_` 開頭）

> ⚠️ 不要複製 **secret** 或 **service_role** key，那是最高權限的鑰匙，絕對不能放進網站。

## 步驟 3｜架設網站（Cloudflare Pages）

1. 登入 **dash.cloudflare.com** → 左側 **Workers & Pages** → **Create**。
2. 畫面下方點 **Continue to Pages**（「Need to use the legacy Pages workflow?」那一行）。
3. **Import an existing Git repository** → **GitHub** → 授權後選你的 `story-forest` → **Begin setup**。
4. 設定：
   - **Project name**：自己取，會變成網址，例如 `mia-story-forest` → `mia-story-forest.pages.dev`
   - **Framework preset**：**React (Vite)**
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
   - 展開 **Environment variables**，新增兩筆：
     - `VITE_SUPABASE_URL` ＝ Project URL
     - `VITE_SUPABASE_ANON_KEY` ＝ Publishable key
5. 按 **Save and Deploy**，等 1～2 分鐘，就會得到你的網址。

## 步驟 4｜把網址告訴 Supabase

Supabase → **Authentication** → **URL Configuration**：

- **Site URL**：`https://你的網址.pages.dev` → **Save changes**
- **Redirect URLs**：**Add URL** → `https://你的網址.pages.dev/**`

## 步驟 5｜開始使用 🎉

1. 用手機打開你的網址 → **註冊新帳號** → **建立我的家庭** → 新增孩子。
2. 和孩子一起選這個月的樹，按 **＋** 記錄今天讀的繪本。
3. 想和另一半一起記錄：**設定 → 產生邀請碼**，對方註冊時選 **我有邀請碼**。

建議把網址加到手機主畫面，之後像 App 一樣打開。

---

## 常見問題

**網站顯示「連不上資料庫」？**
Supabase 免費專案超過一週沒使用會自動暫停。登入 supabase.com 打開專案，按 **Restore project**，等幾分鐘就恢復，資料不會遺失。

**網站顯示「還沒連接資料庫」？**
環境變數沒填好。到 Cloudflare 專案 **Settings → Variables and Secrets** 補上，再到 **Deployments** 最新一筆按 **⋯ → Retry deployment**。

**掃描或查不到書？**
書籍資料來自 Google Books 與 Open Library，台灣小型出版社或很新的繪本常常沒有收錄，可以用「手動新增」並自己拍封面。掃描需要允許瀏覽器使用相機。

**資料安全嗎？**
資料存在你自己的 Supabase 專案，只有你和你邀請的家長看得到。孩子只需要暱稱，不用真實姓名。設定裡可以隨時匯出全部紀錄，或永久刪除帳號。

**會不會要付錢？**
一般家庭使用不會超過免費額度，只有主動升級方案才會付費。各服務的免費條款可能調整，請以官網為準。

**原作者推出新版本，我要怎麼更新？**
到你 GitHub 的 `story-forest` 倉庫，按 **Sync fork** → **Update branch**，Cloudflare 會自動更新網站。更新說明如果提到新的 SQL（例如 `supabase/update-phase4.sql`），再到 Supabase 的 SQL Editor 執行一次。

---

## 目前進度

- ✅ 第一階段：手機版互動原型
- ✅ 第二階段：登入、家庭與孩子資料、邀請另一位家長、匯出與刪除
- ✅ 第三階段：ISBN 掃描、書籍查詢、分類建議、封面照片、繪本書房、閱讀月曆
- ✅ 第四階段：每月選樹、果樹閱讀樹、果實、季節的花與小動物
- ⏳ 第五階段：孩子互動模式、每月報告、年度森林
