# Lojistik & Depo Araç Rampa Yönetim Sistemi (YMS)

Depo, rampa, araç kabul, beklenen araçlar, canlı izleme ve güvenlik entegrasyonlu kapsamlı **Saha ve Rampa Yönetim Sistemi (Yard Management System)**.

---

## 🚀 Proje Özellikleri

- 🚛 **Araç Yönetimi:** Bekleme sahasındaki araçlar, evrak durumu takibi, rampa atamaları ve saha çıkış onayları.
- 🏢 **Rampa Yönetimi:** Boş/Dolu/Bakımda rampa durumları, anlık araç yanaştırma ve rampa değiştirme.
- 📋 **Beklenen Araçlar:** Planlanan sevkiyat ve kabul listesi, tek tıkla sahaya kabul kaydı.
- 📡 **Canlı Rampa ve Saha Takibi:** Dinamik depo filtreli canlı izleme ve durum göstergeleri.
- 🚨 **Güvenlik & Çağrı Paneli:** Rampaya çağrılan araçların güvenlik kontrol noktasından onaylanıp rampaya yönlendirilmesi.
- 📊 **Raporlama ve Dışa Aktarma:** Excel (.xlsx) ve CSV formatında anlık veri dışa aktarma.
- 💬 **Operasyonel Vardiya Sohbeti:** Personel ve şoför iletişimi için entegre mesajlaşma paneli.
- ⚡ **Gerçek Zamanlı Senkronizasyon:** Firebase Firestore ile tüm cihazlar ve ekranlar arasında anlık canlı veri akışı.

---

## 🔑 Varsayılan Giriş Bilgileri

| Rol | Kullanıcı Adı | Şifre | Yetki Kapsamı |
| :--- | :--- | :--- | :--- |
| **Yönetici (Admin)** | `admin` | `admin` | Tüm depolar, rampalar, kullanıcılar ve tam yetki |
| **Güvenlik (Security)** | `Güvenlik` | `Güvenlik123` | Kapı kabul, çağrı onaylama ve güvenlik yönlendirmeleri |
| **Misafir (Guest)** | `Misafir` | `Misafir123` | Yalnızca canlı izleme ve bilgilendirme ekranları |

---

## 💻 Yerel Geliştirme (Local Setup)

Projeyi bilgisayarınızda çalıştırmak için:

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Geliştirme sunucusunu başlatın
npm run dev

# 3. Üretim (Production) derlemesi alın
npm run build
```

---

## 📦 Adım 1: GitHub'a Yükleme (Push to GitHub)

Projenizi yeni bir GitHub deposuna yüklemek için aşağıdaki adımları terminalinizde sırasıyla çalıştırın:

```bash
# 1. Proje ana dizininde Git başlatın
git init

# 2. Tüm dosyaları ekleyin (.gitignore gereksiz dosyaları otomatik hariç tutar)
git add .

# 3. İlk commit'inizi oluşturun
git commit -m "feat: lojistik ve depo araç rampa yönetim sistemi ilk sürüm"

# 4. Ana dal adını 'main' yapın
git branch -M main

# 5. GitHub'da oluşturduğunuz boş reponun adresini ekleyin
# (Örnek: https://github.com/KULLANICI_ADINIZ/lojistik-depo-yonetim.git)
git remote add origin https://github.com/KULLANICI_ADINIZ/REPA_ADINIZ.git

# 6. GitHub'a gönderin
git push -u origin main
```

---

## ☁️ Adım 2: Vercel ile Yayınlama (Deploy on Vercel)

Proje Vercel ile %100 uyumludur (`vercel.json` SPA yönlendirmeleri projenizde hazırdır).

### 1. Yöntem: Vercel Web Paneli Üzerinden (Önerilen)

1. [vercel.com](https://vercel.com) adresine gidin ve GitHub hesabınızla giriş yapın.
2. **"Add New..."** > **"Project"** butonuna tıklayın.
3. GitHub reponuzu listeden seçip **"Import"** deyin.
4. **Build and Output Settings** otomatik olarak tanınacaktır:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. *(İsteğe Bağlı ama Önerilen)* **Environment Variables** bölümüne Firestore değişkenlerinizi ekleyin:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_DATABASE_ID`
   *(Not: `firebase-applet-config.json` dosyasını repo ile gönderiyorsanız bu değişkenleri girmeseniz de otomatik bağlanır).*
6. **"Deploy"** butonuna tıklayın. 1-2 dakika içinde uygulamanız canlı bağlantı adresiyle yayında olacaktır!

---

## 🛡️ Firestore Güvenlik Kuralları (firestore.rules)

Firebase konsolunda Firestore veritabanınızın Rules sekmesine projedeki `firestore.rules` dosyasının içeriğini yapıştırıp yayınlayabilirsiniz.
