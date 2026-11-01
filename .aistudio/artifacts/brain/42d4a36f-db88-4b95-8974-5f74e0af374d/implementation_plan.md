# Canlı Rampa Gecikme Sayacı ve Aşama Bazlı Süre Takibi Planı

Bu geliştirme, Rampa Yönetimi ve Canlı İzleme ekranlarında rampada olan ('Dolu') araçlar için gerçek zamanlı bir gecikme sayacı sunar ve aracın tesis içindeki tüm yaşam döngüsü sürelerini (Kayıt → Evrak Hazır → Rampa → Çıkış) detaylı olarak analiz eder.

---

## 1. Özellikler ve Hedefler

### A. İşlem Türüne Göre Hedef Süreler (SLA)
- **Boşaltma:** Varsayılan **60 dakika** hedef işlem süresi.
- **Yükleme:** Varsayılan **90 dakika** hedef işlem süresi.
- **Tahliye:** Varsayılan **60 dakika** hedef işlem süresi.
*(Yönetici bu hedef süreleri ayarlar menüsünden dilediğinde güncelleyebilir)*

### B. Canlı Gecikme Sayacı & Kırmızı Alarm
- **Süreç Başlangıcı:** Aracın rampaya giriş anı (`rampadaTimestamp` / `rampayaGirisTarihi`).
- **Canlı Güncelleme:** Sayfa yenilenmeden her 30 saniyede bir sayaç otomatik güncellenir.
- **Görsel Durumlar:**
  - 🟢 **Süre Dahilinde:** Hedef sürenin altındaki araçlar için geçen süre ve kalan süre normal renklerle gösterilir.
  - 🔴 **Gecikmede:** Hedef süreyi aşan araçlar kırmızı renkle, yanıp sönen `🔴 +X Dk Gecikme` rozeti, kırmızı çerçeve ve doluluk çubuğu ile vurgulanır.

### C. Yaşam Döngüsü Aşama Süreleri Takibi
Her araç için 3 kritik aşama süresi net biçimde hesaplanıp görselleştirilir:
1. **Evrak Hazırlık Süresi:** Tesise kayıt (`girisTimestamp`) ile `EVRAK HAZIR` durumu (`evrakHazirTimestamp`) arasındaki geçen süre.
2. **Rampa Bekleme Süresi:** Evrak hazır hale geldikten sonra rampaya giriş (`rampadaTimestamp`) anına kadar sahada beklenen süre.
3. **Rampa İşlem Süresi:** Rampaya yanaştıktan şu ana kadarki (veya rampadan çıkışa kadarki) süre ve SLA hedef farkı.
4. **Toplam Tesis Süresi:** Kapı girişinden çıkışa kadarki toplam süre.

---

## 2. Etkilenecek Ekranlar ve Entegrasyon

### 1. `src/utils/slaHelpers.ts` (Yeni Modül)
- Hedef SLA süre sabitleri ve dinamik hesaplama motoru.
- `getRampSlaInfo(vehicle)`: Geçen süre, hedef süre, aşılan dakika, durum (`NORMAL` / `OVERDUE`) ve aşama sürelerinin (Evrak Süresi, Rampa Bekleme Süresi) hesaplanması.

### 2. Rampa Yönetimi (`src/components/RampManagementView.tsx`)
- Rampada araç olduğunda kartın üzerinde canlı gecikme sayacı:
  - Normal durum: *"Rampa Süresi: 35 Dk / Hedef 60 Dk"*
  - Aşıldığında: *"🔴 Gecikme: +22 Dk (Toplam: 82 Dk)"* kırmızı animasyonlu ikaz.
- Araç kartına kompakt aşama dökümü ("Evrak: 18 Dk | Bekleme: 24 Dk").

### 3. Canlı İzleme (`src/components/LiveTrackingView.tsx`)
- **Masaüstü Tablo:** "Süreç & Tarihler" ve "Geçen Süre" sütunlarında canlı rampa süresi, aşama süreleri ve kırmızı gecikme rozeti.
- **Mobil Kartlar:** Kart üzerinde kırmızı gecikme barı ve evrak hazırlık / rampa bekleme süreleri.

### 4. Araç Detay / İncele Modalı (`src/components/Modals.tsx`)
- Açılan detay penceresine şık bir **"Süreç ve Yaşam Döngüsü Zaman Çizelgesi"** (Timeline):
  - 1. Kapı Girişi -> Evrak Hazır (Geçen: X dk)
  - 2. Evrak Hazır -> Rampa Yanaşma (Geçen: Y dk)
  - 3. Rampa İşlemi -> Şu an (Geçen: Z dk, Hedef: W dk, Durum: Normal / Gecikmeli)

---

## 3. Doğrulama ve Derleme
- `lint_applet` ile TypeScript tip kontrolü.
- `compile_applet` ile derleme testi.
