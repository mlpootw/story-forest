import { Seedling } from '../components/ui'

// 還沒設定 Supabase 環境變數時顯示，不會讓網站壞掉
export default function SetupMissing() {
  return (
    <div className="page flex min-h-screen flex-col justify-center py-10">
      <Seedling className="mx-auto w-20" />
      <h1 className="h-hand mt-3 text-center text-2xl">還沒連接資料庫</h1>
      <div className="notice mt-5">
        <p>網站已經成功部署，但還缺少 Supabase 的連線設定。</p>
        <ol className="mt-2 list-decimal pl-5">
          <li>到 Cloudflare 這個 Pages 專案的 <b>Settings → Variables and Secrets</b></li>
          <li>新增 <code>VITE_SUPABASE_URL</code> 與 <code>VITE_SUPABASE_ANON_KEY</code></li>
          <li>到 <b>Deployments</b>，在最新一筆按 <b>⋯ → Retry deployment</b> 重新部署</li>
        </ol>
      </div>
      <p className="hint mt-4 text-center">請只填 anon（publishable）金鑰，不要填 service_role。</p>
    </div>
  )
}
