# Saha Süre Takip — Vercel web sürümü

Bu proje mevcut Tkinter programındaki konumları, oyun koordinatlarını, süreleri, Harita / 2. Mod görünümünü ve otomatik sayaç döngüsünü web'e taşır. Aynı oda kodunu kullanan tarayıcılar aynı sayaç durumunu paylaşır.

## 1) Supabase veritabanı
1. https://supabase.com üzerinde ücretsiz bir proje oluştur.
2. SQL Editor bölümünde `supabase.sql` dosyasının içeriğini çalıştır.
3. Project Settings → API bölümünden Project URL, anon/public key ve service_role key değerlerini al.

`service_role` anahtarını kesinlikle tarayıcıya koyma. Yalnızca Vercel ortam değişkeninde kullanılmalı.

## 2) Vercel'e yükleme
1. Bu klasörü GitHub'a yeni bir repository olarak yükle.
2. https://vercel.com üzerinden GitHub repository'sini import et.
3. Framework otomatik olarak Vite algılanmalı. Build command `npm run build`, output directory `dist`.
4. Vercel → Project → Settings → Environment Variables bölümünde şunları ekle:

| Variable | Değer |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `VITE_SUPABASE_URL` | Aynı Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

5. Redeploy yap. Vercel sana web adresi verecek.

## 3) Kullanım
- Herkes aynı oda kodunu girer (ör. `KARUS-01`).
- İlk KESTİM tıklaması ilgili sayacın süresini başlatır.
- Sayaç çalışırken tekrar KESTİM'e basılırsa o konumun süresi baştan başlar.
- Süre bitince sayaç durur; yeni süre için kullanıcının tekrar KESTİM'e basması gerekir.
- Son 10 saniyede tarayıcı Türkçe sesli uyarı verir.
- Harita ve 2. Mod arasında geçiş yapılabilir.

## Önemli notlar
- Bu sürümde üyelik yoktur. Oda kodunu bilen herkes o odanın sayaçlarını değiştirebilir; kodu yalnızca güvendiğin kişilerle paylaş.
- Paylaşım Supabase üzerinden yapılır. Tarayıcılar açık ve internete bağlı olmalıdır. Sayfa arka plandayken sayaç bitiş zamanına göre ilerler; tarayıcı/sistem ses oynatmayı kısıtlarsa ses duyulmayabilir.
- Ses, cihazın tarayıcısında bulunan Türkçe konuşma sesini kullanır. Her cihazda aynı kadın sesi veya birebir Emel Neural sesi bulunması garanti değildir. İlk sesli uyarı için sayfada en az bir kez kullanıcı etkileşimi (ör. KESTİM tıklaması) gerekir.
- Bu ilk sürümde sayaç güncellemeleri Supabase Realtime Broadcast ve 5 saniyelik yedek senkronizasyonla paylaşılır.
- Vercel ve Supabase ücretsiz planlarının kota ve uyku/limit koşulları olabilir.
